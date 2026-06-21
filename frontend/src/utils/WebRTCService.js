/**
 * WebRTC Utility Service
 * Handles peer connections, media streams, and signaling
 */

class WebRTCService {
  constructor(signalingSocket) {
    this.signalingSocket = signalingSocket;
    this.peers = new Map(); // Map of userId -> RTCPeerConnection
    this.localStream = null;
    this.mediaConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
    };
    
    this.iceServers = [
      { urls: ['stun:stun.l.google.com:19302'] },
      { urls: ['stun:stun1.l.google.com:19302'] },
      { urls: ['stun:stun2.l.google.com:19302'] },
      { urls: ['stun:stun3.l.google.com:19302'] },
      { urls: ['stun:stun4.l.google.com:19302'] },
    ];
  }

  /**
   * Get local media stream (audio + video)
   */
  async getLocalStream(audio = true, video = true) {
    try {
      const constraints = {
        audio: audio ? this.mediaConstraints.audio : false,
        video: video ? this.mediaConstraints.video : false,
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw new Error(`Media access denied: ${error.message}`);
    }
  }

  /**
   * Stop local media stream
   */
  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }

  /**
   * Create peer connection for a specific user
   */
  createPeerConnection(userId, isInitiator = false) {
    const peerConnection = new RTCPeerConnection({
      iceServers: this.iceServers,
    });

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream);
      });
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalingSocket.emit('ice-candidate', {
          to: userId,
          candidate: event.candidate,
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state with ${userId}:`, peerConnection.connectionState);
      if (peerConnection.connectionState === 'failed' || 
          peerConnection.connectionState === 'disconnected') {
        this.closePeerConnection(userId);
      }
    };

    this.peers.set(userId, {
      connection: peerConnection,
      isInitiator,
      stream: null,
    });

    return peerConnection;
  }

  /**
   * Create and send offer to peer
   */
  async createAndSendOffer(userId) {
    try {
      const peerData = this.peers.get(userId);
      if (!peerData) {
        console.error(`Peer connection not found for ${userId}`);
        return;
      }

      const offer = await peerData.connection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await peerData.connection.setLocalDescription(offer);

      this.signalingSocket.emit('offer', {
        to: userId,
        offer,
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }

  /**
   * Handle received offer
   */
  async handleOffer(userId, offer) {
    try {
      let peerData = this.peers.get(userId);
      
      if (!peerData) {
        this.createPeerConnection(userId, false);
        peerData = this.peers.get(userId);
      }

      await peerData.connection.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await peerData.connection.createAnswer();
      await peerData.connection.setLocalDescription(answer);

      this.signalingSocket.emit('answer', {
        to: userId,
        answer,
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  /**
   * Handle received answer
   */
  async handleAnswer(userId, answer) {
    try {
      const peerData = this.peers.get(userId);
      if (!peerData) {
        console.error(`Peer connection not found for ${userId}`);
        return;
      }

      await peerData.connection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  /**
   * Handle ICE candidate
   */
  async handleICECandidate(userId, candidate) {
    try {
      const peerData = this.peers.get(userId);
      if (!peerData) {
        console.error(`Peer connection not found for ${userId}`);
        return;
      }

      await peerData.connection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  /**
   * Get remote stream from peer
   */
  getRemoteStream(userId, onStreamReceived) {
    const peerData = this.peers.get(userId);
    if (!peerData) return;

    peerData.connection.ontrack = (event) => {
      console.log('Track received from', userId);
      peerData.stream = event.streams[0];
      if (onStreamReceived) {
        onStreamReceived(userId, event.streams[0]);
      }
    };
  }

  /**
   * Toggle audio on/off
   */
  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Toggle video on/off
   */
  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Get audio/video enabled status
   */
  getMediaStatus() {
    return {
      audioEnabled: this.localStream?.getAudioTracks()[0]?.enabled ?? false,
      videoEnabled: this.localStream?.getVideoTracks()[0]?.enabled ?? false,
    };
  }

  /**
   * Close connection with specific peer
   */
  closePeerConnection(userId) {
    const peerData = this.peers.get(userId);
    if (peerData) {
      peerData.connection.close();
      this.peers.delete(userId);
      console.log(`Closed peer connection with ${userId}`);
    }
  }

  /**
   * Close all peer connections
   */
  closeAllConnections() {
    this.peers.forEach((peerData, userId) => {
      try {
        // Close all tracks in the peer connection
        peerData.connection.getSenders().forEach(sender => {
          try {
            sender.track?.stop();
          } catch (err) {
            console.error('Error stopping sender track:', err);
          }
        });
        peerData.connection.getReceivers().forEach(receiver => {
          try {
            receiver.track?.stop();
          } catch (err) {
            console.error('Error stopping receiver track:', err);
          }
        });
        // Close the peer connection
        peerData.connection.close();
        console.log(`Closed peer connection with ${userId}`);
      } catch (err) {
        console.error(`Error closing peer connection ${userId}:`, err);
      }
    });
    this.peers.clear();
  }

  /**
   * Complete cleanup - stop all media and connections
   */
  cleanup() {
    console.log('Starting WebRTC cleanup...');
    
    // Stop local stream
    this.stopLocalStream();
    
    // Close all peer connections
    this.closeAllConnections();
    
    console.log('WebRTC cleanup completed');
  }

  /**
   * Get all active peer connections
   */
  getActivePeers() {
    return Array.from(this.peers.keys());
  }
}

export default WebRTCService;
