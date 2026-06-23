import { AppDataSource } from '../../data-source';
import { SmsLog } from './sms-log.entity';
import https from 'https';
import querystring from 'querystring';

const smsLogRepo = () => AppDataSource.getRepository(SmsLog);

export class SmsService {
  /**
   * Formats and validates a phone number to E.164 international format.
   */
  public formatPhoneNumber(phone: string): string {
    let cleaned = phone.trim().replace(/\s+/g, '').replace(/[-()]/g, '');
    if (!cleaned) {
      throw new Error('Phone number is empty or invalid.');
    }

    // If already starts with '+', it is international. Check length.
    if (cleaned.startsWith('+')) {
      if (cleaned.length < 8 || cleaned.length > 15) {
        throw new Error(`Phone number ${phone} has invalid length for international format.`);
      }
      return cleaned;
    }

    // If starts with '00', replace with '+'
    if (cleaned.startsWith('00')) {
      cleaned = '+' + cleaned.substring(2);
      if (cleaned.length < 8 || cleaned.length > 15) {
        throw new Error(`Phone number ${phone} has invalid length for international format.`);
      }
      return cleaned;
    }

    // Handle local Tanzania numbers (e.g. 0752... or 06... or 07...) -> country code +255
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      return '+255' + cleaned.substring(1);
    }

    // If it's a 9 digit number without prefix, assume Tanzania (+255)
    if (cleaned.length === 9) {
      return '+255' + cleaned;
    }

    // If it has no '+', but looks like a valid international number, prepend '+'
    if (/^\d{9,14}$/.test(cleaned)) {
      return '+' + cleaned;
    }

    throw new Error(`Unable to parse phone number: ${phone}. Please include the country code (e.g. +255...).`);
  }

  /**
   * High-level method called to send an SMS and log it.
   */
  public async sendSms(rawPhone: string, message: string): Promise<SmsLog> {
    let formattedPhone: string;
    try {
      formattedPhone = this.formatPhoneNumber(rawPhone);
    } catch (err: any) {
      // Log immediate failure due to invalid formatting
      const log = new SmsLog();
      log.phone_number = rawPhone;
      log.message = message;
      log.provider = process.env.SMS_PROVIDER || 'mock';
      log.status = 'failed';
      log.error_message = err.message;
      log.provider_response = null;
      log.retry_count = 0;
      return await smsLogRepo().save(log);
    }

    const log = new SmsLog();
    log.phone_number = formattedPhone;
    log.message = message;
    log.provider = process.env.SMS_PROVIDER || 'mock';
    log.status = 'pending';
    log.error_message = null;
    log.provider_response = null;
    log.retry_count = 0;

    const savedLog = await smsLogRepo().save(log);

    // Run the actual provider call asynchronously to not block the request,
    // but return the initial log so the caller can track the reference
    this.executeSending(savedLog).catch((err) => {
      console.error(`[SmsService] Failed to execute sending for log ${savedLog.id}:`, err);
    });

    return savedLog;
  }

  /**
   * Manually trigger a retry for a failed log entry.
   */
  public async retrySms(logId: string): Promise<SmsLog> {
    const log = await smsLogRepo().findOneBy({ id: logId });
    if (!log) {
      throw new Error(`SMS Log not found: ${logId}`);
    }

    if (log.status === 'sent' || log.status === 'delivered') {
      return log; // Already succeeded
    }

    log.status = 'pending';
    log.error_message = null;
    log.provider_response = null;
    log.retry_count += 1;
    
    const updatedLog = await smsLogRepo().save(log);
    
    // Execute sending
    this.executeSending(updatedLog).catch((err) => {
      console.error(`[SmsService] Failed to retry sending for log ${updatedLog.id}:`, err);
    });

    return updatedLog;
  }

  /**
   * Retrieves all SMS logs.
   */
  public async getLogs(): Promise<SmsLog[]> {
    return await smsLogRepo().find({
      order: { created_at: 'DESC' }
    });
  }

  /**
   * Executes the sending process for a given pending log entry.
   */
  public async executeSending(log: SmsLog): Promise<void> {
    const provider = log.provider;
    try {
      console.log(`[SmsService] Attempting to send SMS (ID: ${log.id}) to ${log.phone_number} using ${provider}...`);
      let response: any;

      if (provider === 'twilio') {
        response = await this.sendViaTwilio(log.phone_number, log.message);
      } else if (provider === 'africastalking') {
        response = await this.sendViaAfricasTalking(log.phone_number, log.message);
      } else {
        response = await this.sendViaMock(log.phone_number, log.message);
      }

      log.status = 'sent';
      log.provider_response = JSON.stringify(response);
      log.error_message = null;
      await smsLogRepo().save(log);
      console.log(`[SmsService] SMS (ID: ${log.id}) sent successfully!`);
    } catch (err: any) {
      log.status = 'failed';
      log.error_message = err.message || 'Unknown error';
      log.provider_response = err.responseBody ? String(err.responseBody) : null;
      await smsLogRepo().save(log);
      console.error(`[SmsService] SMS (ID: ${log.id}) delivery failed:`, err.message);

      // Trigger automatic retry with exponential backoff
      this.scheduleAutoRetry(log);
    }
  }

  /**
   * Schedules an automatic retry with exponential backoff.
   */
  private scheduleAutoRetry(log: SmsLog): void {
    if (log.retry_count >= 3) {
      console.log(`[SmsService] Max retries (3) reached for SMS log ${log.id}. Giving up.`);
      return;
    }

    const nextRetryCount = log.retry_count + 1;
    const delayMs = Math.pow(2, nextRetryCount) * 1000; // 2s, 4s, 8s...
    console.log(`[SmsService] Scheduling auto-retry #${nextRetryCount} for SMS log ${log.id} in ${delayMs}ms`);

    setTimeout(async () => {
      // Reload log in case status or retry_count changed
      const currentLog = await smsLogRepo().findOneBy({ id: log.id });
      if (currentLog && currentLog.status === 'failed') {
        currentLog.retry_count = nextRetryCount;
        await smsLogRepo().save(currentLog);
        this.executeSending(currentLog).catch((err) => {
          console.error(`[SmsService] Failed during auto-retry of log ${log.id}:`, err);
        });
      }
    }, delayMs);
  }

  /**
   * Twilio HTTP Client implementation.
   */
  private sendViaTwilio(to: string, body: string): Promise<any> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !from) {
      return Promise.reject(new Error('Twilio credentials not configured. Verify TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER in .env.'));
    }

    if (accountSid.startsWith('YOUR_') || authToken.startsWith('YOUR_')) {
      return Promise.reject(new Error('Twilio credentials are still placeholders. Please update them with valid API credentials.'));
    }

    return new Promise((resolve, reject) => {
      const postData = querystring.stringify({ To: to, From: from, Body: body });
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const options = {
        hostname: 'api.twilio.com',
        port: 443,
        path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
          'Authorization': `Basic ${auth}`
        }
      };

      const req = https.request(options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => { responseBody += chunk; });
        res.on('end', () => {
          let parsed;
          try { parsed = JSON.parse(responseBody); } catch (e) { parsed = responseBody; }
          
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            const err: any = new Error(parsed?.message || `Twilio API returned HTTP ${res.statusCode}`);
            err.responseBody = responseBody;
            reject(err);
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.write(postData);
      req.end();
    });
  }

  /**
   * Africa's Talking HTTP Client implementation.
   */
  private sendViaAfricasTalking(to: string, body: string): Promise<any> {
    const username = process.env.AT_USERNAME;
    const apiKey = process.env.AT_API_KEY;
    const from = process.env.AT_SENDER_ID; // optional senderId/shortcode

    if (!username || !apiKey) {
      return Promise.reject(new Error('Africa\'s Talking credentials not configured. Verify AT_USERNAME and AT_API_KEY in .env.'));
    }

    if (username.startsWith('YOUR_') || apiKey.startsWith('YOUR_')) {
      return Promise.reject(new Error('Africa\'s Talking credentials are still placeholders. Please update them with valid API credentials.'));
    }

    return new Promise((resolve, reject) => {
      const payload: any = {
        username: username,
        to: to,
        message: body
      };
      if (from) {
        payload.from = from;
      }
      const postData = querystring.stringify(payload);

      const options = {
        hostname: 'api.africastalking.com',
        port: 443,
        path: '/version1/messaging',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
          'ApiKey': apiKey,
          'Accept': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => { responseBody += chunk; });
        res.on('end', () => {
          let parsed;
          try { parsed = JSON.parse(responseBody); } catch (e) { parsed = responseBody; }
          
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            // Check for delivery errors inside Africa's Talking response structure
            const recipients = parsed?.SMSMessageData?.Recipients;
            if (recipients && recipients.length > 0) {
              const status = recipients[0].status;
              if (status === 'Success') {
                resolve(parsed);
              } else {
                const err: any = new Error(`Africa's Talking gateway error status: ${status}`);
                err.responseBody = responseBody;
                reject(err);
              }
            } else {
              resolve(parsed);
            }
          } else {
            const err: any = new Error(`Africa's Talking API returned HTTP ${res.statusCode}`);
            err.responseBody = responseBody;
            reject(err);
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.write(postData);
      req.end();
    });
  }

  /**
   * Mock sending simulator.
   */
  private sendViaMock(to: string, body: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // Simulate network request duration
      setTimeout(() => {
        console.log(`\n======================================================`);
        console.log(`[MOCK GATEWAY OUTBOX]`);
        console.log(`To: ${to}`);
        console.log(`Body: ${body}`);
        console.log(`======================================================\n`);
        
        // Mock successful sandbox delivery status
        resolve({
          gateway: 'mock-sandbox',
          messageId: `mock-msg-${Math.random().toString(36).substr(2, 9)}`,
          status: 'success',
          timestamp: new Date().toISOString()
        });
      }, 500);
    });
  }
}
