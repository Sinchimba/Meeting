# WebRTC Integration Guide

## Overview

WebRTC (Web Real-Time Communication) has been integrated into the Smart Meeting Platform to enable real-time video and audio communication between participants. This document explains the implementation and how to use it.

## Architecture

### Components

1. **WebRTCService** (`frontend/src/utils/WebRTCService.js`)
   - Manages peer connections
   - Handles media streams (audio/video)
   - Manages ICE candidates and SDP offer/answer exchange
   - Provides simple API for common WebRTC operations

2. **Backend Signaling** (`backend/src/index.js`)
   - Routes WebRTC signaling events (offer, answer, ICE candidates)
   - Ensures proper delivery to correct peers

3. **MeetingRoom Component** (`frontend/src/pages/MeetingRoom.jsx`)
   - Initializes WebRTC connections
   - Manages local and remote video streams
   - Provides media controls (mute, camera toggle)
   - Displays video grid with all participants

## How It Works

### Connection Flow

```
1. User A joins meeting
   ↓
2. Gets local media stream (audio + video)
   ↓
3. User B joins meeting
   ↓
4. Both users notified of new participant
   ↓
5. Create peer connections
   ↓
6. Exchange SDP offers/answers via signaling
   ↓
7. Gather and exchange ICE candidates
   ↓
8. Direct peer-to-peer connection established
   ↓
9. Media streams exchanged
   ↓
10. Video displayed in video grid
```

### Key WebRTC Concepts

**Peer Connection (RTCPeerConnection)**
- Represents connection between two peers
- One peer per other participant in the meeting

**Signaling**
- Exchange of connection metadata (offer/answer/ICE)
- Handled via Socket.IO in this implementation
- **Note:** Not actual media - media flows directly peer-to-peer

**ICE (Interactive Connectivity Establishment)**
- Finds optimal path for media between peers
- Handles NAT traversal
- Uses STUN servers (public IP discovery)

**Media Streams**
- Audio and video tracks
- Captured from user's device
- Sent to peer connections
- Received from remote peers

## Frontend Implementation

### WebRTCService API

```javascript
// Get local media stream
await webrtc.getLocalStream(audio = true, video = true)

// Create peer connection
webrtc.createPeerConnection(userId, isInitiator = false)

// Create and send offer
await webrtc.createAndSendOffer(userId)

// Handle received offer
await webrtc.handleOffer(userId, offer)

// Handle received answer
await webrtc.handleAnswer(userId, answer)

// Handle ICE candidate
await webrtc.handleICECandidate(userId, candidate)

// Toggle audio
webrtc.toggleAudio(enabled)

// Toggle video
webrtc.toggleVideo(enabled)

// Get media status
const status = webrtc.getMediaStatus()

// Close specific peer connection
webrtc.closePeerConnection(userId)

// Close all connections
webrtc.closeAllConnections()

// Stop local stream
webrtc.stopLocalStream()
```

### MeetingRoom Component State

```javascript
// Video and audio enabled/disabled
const [audioEnabled, setAudioEnabled] = useState(true)
const [videoEnabled, setVideoEnabled] = useState(true)

// Map of userId -> MediaStream
const [remoteStreams, setRemoteStreams] = useState(new Map())

// Connection status
const [connectionStatus, setConnectionStatus] = useState('connecting')

// Error messages
const [error, setError] = useState('')

// Loading state
const [loading, setLoading] = useState(true)
```

## Backend Implementation

### Socket.IO Events

**Sending:**
```javascript
socket.emit('offer', { to: userId, offer })
socket.emit('answer', { to: userId, answer })
socket.emit('ice-candidate', { to: userId, candidate })
```

**Receiving:**
```javascript
socket.on('receive-offer', ({ from, offer }) => { ... })
socket.on('receive-answer', ({ from, answer }) => { ... })
socket.on('receive-ice-candidate', ({ from, candidate }) => { ... })
```

### Event Flow

```
User A                  Server                  User B
  |                       |                       |
  |--- offer ----------→  |                       |
  |                       |--- offer ----------→  |
  |                       |  ← --- answer --------|
  |  ← --- answer --------|                       |
  |                       |                       |
  |--- ice-candidate -->  |                       |
  |                       |--- ice-candidate -->  |
  |  ← ---ice-candidate---|                       |
  |                       |  ← ---ice-candidate--|
  |                       |                       |
  |===== Direct P2P Media Connection Established ==|
```

## Features

### ✅ Implemented

- Real-time video and audio streaming
- Multiple participant support
- Mute/unmute audio
- Camera on/off toggle
- Video quality optimization (adaptive bitrate)
- Ice candidate gathering
- Automatic peer discovery and connection
- Media stream display grid
- Participant status indicators
- Connection state monitoring
- Echo cancellation and noise suppression
- Error handling and recovery

### 🔄 Configuration

**Media Constraints** (`WebRTCService.js`):
```javascript
mediaConstraints = {
  audio: {
    echoCancellation: true,    // Remove echo
    noiseSuppression: true,    // Reduce background noise
    autoGainControl: true,     // Auto adjust volume
  },
  video: {
    width: { ideal: 1280 },    // Target resolution
    height: { ideal: 720 },
    frameRate: { ideal: 30 },  // Target FPS
  }
}
```

**ICE Servers**:
- Uses Google STUN servers for NAT traversal
- Add TURN servers in production for better connectivity

## Usage

### Starting a Meeting

1. Enter name and select role on home page
2. Click "Create Meeting"
3. Browser requests media permissions
4. Grant permission to access camera and microphone
5. Video appears in local video container
6. Share meeting code with other participants

### Joining a Meeting

1. Enter name and select role
2. Enter meeting code
3. Click "Join Meeting"
4. Grant media permissions
5. Wait for connection to establish
6. See other participants' videos appear

### Media Controls

- **🎤 / 🔇** - Mute/unmute audio
- **📹 / 📵** - Enable/disable video
- **☎️ Leave** - Disconnect and leave meeting

## Browser Support

### Desktop
- ✅ Chrome/Chromium (v72+)
- ✅ Firefox (v66+)
- ✅ Safari (v11+)
- ✅ Edge (v79+)

### Mobile
- ✅ Chrome Android
- ✅ Firefox Android
- ✅ Safari iOS (limited)

## Performance Optimization

### Bitrate Management
- Video: Adaptive bitrate (target 2-5 Mbps)
- Audio: 16-32 kbps
- Automatically adapts to network conditions

### Frame Rate
- Target: 30 FPS
- Adapts based on bandwidth

### Video Resolution
- Target: 1280x720 (720p)
- Adapts to screen size and bandwidth

## Security Considerations

### Current Implementation
- ✅ HTTPS enforced in production
- ✅ DTLS-SRTP (encrypted media)
- ✅ ICE consent checks (prevents connection hijacking)

### Recommendations
- Add TURN servers for production (relay servers)
- Implement end-to-end encryption for sensitive meetings
- Add authentication before joining meetings
- Rate limiting on signaling events
- Validate all signaling messages on backend

## Troubleshooting

### No Video/Audio

**Check:**
1. Browser permissions granted
2. Camera/microphone working in other apps
3. Console for errors
4. Browser support (Chrome/Firefox recommended)

**Solution:**
```bash
# Check browser permissions
- Settings → Privacy and security → Camera/Microphone
- Allow for localhost

# Check system permissions
- macOS: System Preferences → Security & Privacy
- Linux: Check /dev/video0 access
- Windows: Settings → Privacy & Security
```

### Connection Not Established

**Check:**
1. Both users see connection status: "connected"
2. No firewall blocking WebRTC ports
3. Both on same meeting ID
4. Backend running and accessible

**Debug:**
- Open DevTools (F12)
- Check console for errors
- Check Network tab for signaling events
- Test with same browser first

### Poor Video Quality

**Causes:**
- Low bandwidth
- High CPU usage
- Too many participants
- Network congestion

**Solutions:**
1. Reduce video resolution
2. Close other apps
3. Limit participant count
4. Use wired connection if possible

### Echoing Audio

**Cause:** Echo cancellation not working properly

**Solutions:**
1. Use headphones instead of speaker
2. Check microphone placement
3. Reduce speaker volume
4. Use external speakers/mic

## Advanced Configuration

### Custom STUN/TURN Servers

```javascript
const iceServers = [
  { urls: ['stun:stun.example.com:3478'] },
  {
    urls: ['turn:turn.example.com:3478'],
    username: 'user',
    credential: 'pass'
  }
]
```

### Custom Media Constraints

```javascript
const constraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: false, // Disable auto gain
    sampleRate: 48000       // Higher sample rate
  },
  video: {
    width: { min: 640, ideal: 1280, max: 1920 },
    height: { min: 480, ideal: 720, max: 1080 },
    frameRate: { ideal: 24, max: 60 },
    facingMode: "user"       // Front camera on mobile
  }
}
```

## Production Deployment

### Checklist

- [ ] Use HTTPS (required for getUserMedia)
- [ ] Set up TURN servers for NAT traversal
- [ ] Configure ICE servers for your region
- [ ] Monitor connection metrics
- [ ] Implement bandwidth management
- [ ] Add graceful degradation (fallback to audio-only)
- [ ] Set up error tracking
- [ ] Test with various network conditions
- [ ] Optimize for mobile networks
- [ ] Add metrics and analytics

### Monitoring

Add logging for:
- Connection state changes
- Media stream availability
- ICE candidate gathering
- Audio/video quality metrics
- Error events

## Future Enhancements

- [ ] Screen sharing
- [ ] Recording capability
- [ ] Conference layout options
- [ ] Virtual backgrounds
- [ ] Hand raise feature
- [ ] Picture-in-picture mode
- [ ] Bandwidth estimation
- [ ] Network quality indicators
- [ ] Automatic quality adjustment
- [ ] SFU (Selective Forwarding Unit) for scale

## Resources

- [WebRTC API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [RTCPeerConnection Guide](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection)
- [WebRTC Best Practices](https://www.html5rocks.com/en/tutorials/webrtc/basics/)
- [STUN/TURN Servers](https://en.wikipedia.org/wiki/STUN)
- [ICE Candidates](https://developer.mozilla.org/en-US/docs/Glossary/ICE)

---

**Last Updated:** April 27, 2026
**WebRTC Version:** 1.0 (MVP)
