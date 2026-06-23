import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'sms_logs' })
export class SmsLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  phone_number!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column()
  provider!: string; // 'twilio' | 'africastalking' | 'mock'

  @Column({ default: 'pending' })
  status!: string; // 'pending' | 'sent' | 'delivered' | 'failed'

  @Column({ type: 'text', nullable: true })
  error_message!: string | null;

  @Column({ type: 'text', nullable: true })
  provider_response!: string | null; // JSON response from provider

  @Column({ default: 0 })
  retry_count!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
