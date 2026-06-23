import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import io from 'socket.io-client'
import { Video, Users, Mic, MicOff, VideoOff, Copy, PhoneOff, HandMetal, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import WebRTCService from '../utils/WebRTCService'
import SpeechToTextService from '../utils/SpeechToTextService'
import SignRecognitionService from '../utils/SignRecognitionService'
import TextToSignAnim from '../components/TextToSignAnim'
import { apiClient } from '../api/client'
import './MeetingRoom.css'

const WS_URL = import.meta.env.VITE_WS_BASE_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'
const SOCKET_PATH = '/ws'

export default function MeetingRoom() {
  const navigate = useNavigate()
  const { meetingId } = useParams()
  const [socket, setSocket] = useState(null)
  const [participants, setParticipants] = useState([])
  const [webrtc, setWebRTC] = useState(null)
  const webrtcRef = useRef(null)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [remoteStreams, setRemoteStreams] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [user, setUser] = useState(null)
  
  // AI States
  const [speechService, setSpeechService] = useState(null)
  const [signService, setSignService] = useState(null)
  const [transcripts, setTranscripts] = useState({}) // { socketId: text }
  const [detectedSigns, setDetectedSigns] = useState([])
  const [currentSpeakerTranscript, setCurrentSpeakerTranscript] = useState('')

  // Host & Role States
  const [userRole, setUserRole] = useState('standard')
  const [meetingHostId, setMeetingHostId] = useState(null)
  const [meetingDetails, setMeetingDetails] = useState(null)
  
  // Text to Speech
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const ttsEnabledRef = useRef(true)
  const [transcribeLang, setTranscribeLang] = useState('en-US')
  const transcribeLangRef = useRef('en-US')

  useEffect(() => {
    ttsEnabledRef.current = ttsEnabled
  }, [ttsEnabled])

  useEffect(() => {
    transcribeLangRef.current = transcribeLang
  }, [transcribeLang])

  const handleLangChange = (e) => {
    const lang = e.target.value
    setTranscribeLang(lang)
    if (speechService) {
      speechService.setLanguage(lang)
    }
  }

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel() // cancel ongoing speech
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance)
    }
  }

  const isCurrentUserHost = user && meetingHostId && user.id === meetingHostId

  const localVideoRef = useRef(null)

  // Get user and fetch meeting details
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const storedTokens = localStorage.getItem('authTokens')
    
    if (storedTokens) {
      try {
        const parsedTokens = JSON.parse(storedTokens)
        apiClient.setTokens(parsedTokens)
      } catch (err) {
        console.error('Failed to parse auth tokens:', err)
      }
    }
    
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        setUser(parsedUser)
        setUserRole(parsedUser.role || 'standard')

        const fetchMeeting = async () => {
          try {
            const meeting = await apiClient.getMeeting(meetingId)
            if (meeting) {
              setMeetingDetails(meeting)
              setMeetingHostId(meeting.hostId || meeting.host_id)
            }
          } catch (err) {
            console.error('Failed to fetch meeting details:', err)
            setError('Failed to load meeting details. You may not have access or the meeting does not exist.')
            setLoading(false)
          }
        }
        fetchMeeting()
      } catch (err) {
        console.error('Failed to parse user:', err)
      }
    } else {
      navigate('/login')
    }
  }, [meetingId, navigate])

  // Initialize Socket.IO connection with authentication
  useEffect(() => {
    if (!user) return

    // Get the JWT token synchronously to prevent race conditions from asynchronous state updates
    const tokens = apiClient.getTokens() || JSON.parse(localStorage.getItem('authTokens') || '{}')
    const token = tokens?.accessToken || ''

    const newSocket = io(WS_URL, {
      path: SOCKET_PATH,
      auth: {
        token: token,
      },
    })

    const updateParticipants = (data) => {
      const participantList = data || []
      const participantsList = participantList.filter((participant) => participant.socketId !== newSocket.id)
      console.log('Participants list updated:', participantsList)

      const activeIds = new Set(participantsList.map(p => p.socketId))
      setParticipants(participantsList)

      setRemoteStreams(prev => {
        const updated = new Map(prev)
        for (const socketId of Array.from(updated.keys())) {
          if (!activeIds.has(socketId)) {
            updated.delete(socketId)
          }
        }
        return updated
      })

      if (webrtcRef.current) {
        webrtcRef.current.getActivePeers().forEach(socketId => {
          if (!activeIds.has(socketId)) {
            webrtcRef.current.closePeerConnection(socketId)
          }
        })
      }
    }

    newSocket.on('connect', () => {
      console.log('Connected to server')
      setConnectionStatus('connected')
    })

    newSocket.on('meeting-error', (data) => {
      console.error('Meeting error:', data.message)
      setError(data.message)
      setConnectionStatus('disconnected')
      newSocket.disconnect()
    })

    newSocket.on('participants-updated', (data) => {
      updateParticipants(data)
    })

    newSocket.on('participant-left', (data) => {
      console.log('Participant left:', data.socketId)
      setParticipants(prev => prev.filter(p => p.socketId !== data.socketId))
      setRemoteStreams(prev => {
        const updated = new Map(prev)
        updated.delete(data.socketId)
        return updated
      })
      if (webrtcRef.current) {
        webrtcRef.current.closePeerConnection(data.socketId)
      }
    })

    newSocket.on('receive-transcript', (data) => {
      setTranscripts(prev => ({
        ...prev,
        [data.from]: data.transcript
      }))
      if (data.isFinal) {
        setCurrentSpeakerTranscript(data.transcript)
        
        // Clear transcript after 4 seconds of inactivity
        setTimeout(() => {
          setTranscripts(prev => {
            const updated = { ...prev }
            if (updated[data.from] === data.transcript) {
              delete updated[data.from]
            }
            return updated
          })
        }, 4000)
      }
    })

    newSocket.on('receive-sign', (data) => {
      setDetectedSigns(prev => {
        const newSigns = [...prev, { ...data, id: Date.now() }]
        return newSigns.slice(-5)
      })
      if (ttsEnabledRef.current) {
        speakText(`${data.userName} signs: ${data.sign}`)
      }
    })

    newSocket.on('admin-muted-you', (data) => {
      alert(`You have been muted by host ${data.by || ''}`)
      if (webrtcRef.current) {
        webrtcRef.current.toggleAudio(false)
        setAudioEnabled(false)
      }
    })

    newSocket.on('admin-kicked-you', (data) => {
      alert(`You have been removed from the meeting by host ${data.by || ''}`)
      leaveCall()
    })

    newSocket.on('meeting-ended', () => {
      alert('The meeting has been ended by the host.')
      leaveCall()
    })

    // WebRTC Signaling Events
    newSocket.on('receive-offer', async (data) => {
      console.log('Received offer from:', data.from)
      if (webrtcRef.current) {
        await webrtcRef.current.handleOffer(data.from, data.offer)
      }
    })

    newSocket.on('receive-answer', async (data) => {
      console.log('Received answer from:', data.from)
      if (webrtcRef.current) {
        await webrtcRef.current.handleAnswer(data.from, data.answer)
      }
    })

    newSocket.on('receive-ice-candidate', async (data) => {
      console.log('Received ICE candidate from:', data.from)
      if (webrtcRef.current) {
        await webrtcRef.current.handleICECandidate(data.from, data.candidate)
      }
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server')
      setConnectionStatus('disconnected')
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [meetingId, userRole, user])

  // Initialize WebRTC
  useEffect(() => {
    if (!socket) return

    const initWebRTC = async () => {
      try {
        setLoading(true)
        
        // Create WebRTC service with the stream handler callback passed directly
        const webrtcService = new WebRTCService(socket, (userId, stream) => {
          console.log('Received remote stream from:', userId)
          setRemoteStreams(prev => {
            const updated = new Map(prev)
            updated.set(userId, stream)
            return updated
          })
        })
        setWebRTC(webrtcService)
        webrtcRef.current = webrtcService

        // Get local media stream
        try {
          await webrtcService.getLocalStream(true, true)
          console.log('Local stream obtained')
        } catch (err) {
          console.warn('Could not get video stream, trying audio only:', err)
          try {
            await webrtcService.getLocalStream(true, false)
          } catch (err2) {
            setError('Could not access media devices')
            console.error('Media access error:', err2)
          }
        }

        // Display local stream
        if (webrtcService.localStream && localVideoRef.current) {
          localVideoRef.current.srcObject = webrtcService.localStream

          // Initialize AI Services after camera is ready
          if (userRole === 'standard') {
            const s2t = new SpeechToTextService((result) => {
              if (socket && user) {
                const text = result.finalTranscript || result.interimTranscript
                if (text.trim()) {
                  socket.emit('speech-transcribed', {
                    meetingId,
                    userName: user.name,
                    transcript: text,
                    isFinal: !!result.finalTranscript
                  })
                  setTranscripts(prev => ({
                    ...prev,
                    [socket.id]: text
                  }))
                  
                  if (result.finalTranscript) {
                    setTimeout(() => {
                      setTranscripts(prev => {
                        const updated = { ...prev }
                        if (updated[socket.id] === text) {
                          delete updated[socket.id]
                        }
                        return updated
                      })
                    }, 4000)
                  }
                }
              }
            }, null, transcribeLangRef.current);
            setSpeechService(s2t);
            s2t.start();
          } else {
            // For mute/deaf users: sign detection and translation assist
            const signSrv = new SignRecognitionService(localVideoRef.current, (sign) => {
               if (socket && user) {
                 socket.emit('sign-detected', {
                   meetingId,
                   userName: user.name,
                   sign: sign
                 })
               }
            });
            setSignService(signSrv);
            signSrv.start();
          }
        }

        // Defer join-meeting emission until local stream is initialized
        const tokens = apiClient.getTokens() || JSON.parse(localStorage.getItem('authTokens') || '{}')
        const token = tokens?.accessToken || ''
        socket.emit('join-meeting', {
          meetingId,
          userName: user.name,
          token: token
        })

        setLoading(false)
        setConnectionStatus('ready')
      } catch (err) {
        console.error('WebRTC initialization error:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    initWebRTC()

    return () => {
      if (webrtc) {
        console.log('Component unmounting - cleaning up WebRTC')
        webrtc.cleanup()
      }
    }
  }, [socket])

  // Create peer connections when participants join
  useEffect(() => {
    if (!webrtc || !socket) return

    participants.forEach(participant => {
      // Don't create peer connection for self
      if (participant.socketId === socket.id) return

      // Check if connection already exists
      if (webrtc.peers.has(participant.socketId)) return

      console.log('Creating peer connection for:', participant.socketId)
      
      // Create peer connection
      const isInitiator = socket.id < participant.socketId // Simple deterministic rule
      webrtc.createPeerConnection(participant.socketId, isInitiator)

      // If initiator, send offer
      if (isInitiator) {
        setTimeout(() => {
          webrtc.createAndSendOffer(participant.socketId)
        }, 500)
      }
    })
  }, [participants, webrtc, socket])

  const toggleAudio = () => {
    if (webrtc) {
      const newState = !audioEnabled
      webrtc.toggleAudio(newState)
      setAudioEnabled(newState)
    }
  }

  const toggleVideo = () => {
    if (webrtc) {
      const newState = !videoEnabled
      webrtc.toggleVideo(newState)
      setVideoEnabled(newState)
    }
  }

  const copyMeetingLink = () => {
    const link = `${window.location.origin}/meeting/${meetingId}`
    navigator.clipboard.writeText(link)
    alert('Meeting link copied to clipboard!')
  }

  const handleAdminMute = (targetSocketId) => {
    if (socket && isCurrentUserHost) {
      console.log('Admin muting participant:', targetSocketId)
      socket.emit('admin-mute-participant', { meetingId, targetSocketId })
    }
  }

  const handleAdminKick = (targetSocketId) => {
    if (socket && isCurrentUserHost) {
      console.log('Admin kicking participant:', targetSocketId)
      socket.emit('admin-kick-participant', { meetingId, targetSocketId })
    }
  }

  const handleEndMeetingForAll = () => {
    if (socket && isCurrentUserHost) {
      const confirmEnd = window.confirm('Are you sure you want to end the meeting for all participants?')
      if (confirmEnd) {
        console.log('Admin ending meeting for all')
        socket.emit('admin-end-meeting', { meetingId })
      }
    }
  }

  const leaveCall = () => {
    console.log('Leaving meeting...')
    if (speechService) {
      speechService.stop()
    }
    if (signService) {
      signService.stop()
    }
    if (webrtcRef.current) {
      console.log('Cleaning up WebRTC...')
      webrtcRef.current.cleanup()
    }
    if (socket) {
      console.log('Disconnecting socket...')
      socket.disconnect()
    }
    console.log('Navigating home...')
    navigate('/home')
  }

  return (
    <div className="meeting-room">
      <div className="meeting-header glass-panel">
        <div className="header-left">
          <h1 className="meeting-title gradient-text">
            <Video size={24} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
            Smart Meeting
          </h1>
          <div className="meeting-info">
            <span className="meeting-id">ID: {meetingId.substring(0, 8).toUpperCase()}...</span>
            <span className="participant-count">
              <Users size={16} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
              {participants.length + 1}
            </span>
          </div>
        </div>
        <div className="header-right">
          <div className={`status-indicator ${connectionStatus}`}>
            {connectionStatus === 'connected' ? <CheckCircle2 size={16} className="text-emerald-400" /> : connectionStatus === 'connecting' ? <Clock size={16} className="text-amber-400" /> : <AlertCircle size={16} className="text-red-400" />}
            <span className="status-text">{connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}</span>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {loading && <div className="loading">Initializing media...</div>}

      <div className="meeting-layout">
        <div className="video-section glass-panel">
          <div className="video-grid">
            {/* Local Video */}
            <div className={`video-container local-video-container local-video ${!videoEnabled ? 'camera-off-bg' : ''}`}>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="video-element"
                style={{ display: videoEnabled ? 'block' : 'none' }}
              />
              {!videoEnabled && (
                <div className="camera-off-fallback">
                  <div className="avatar-large">{user?.name?.charAt(0).toUpperCase()}</div>
                </div>
              )}
              <div className="video-label">
                <span className="user-name">{user?.name} (You)</span>
                <span className="user-role">{userRole}</span>
              </div>
              <div className="media-indicators">
                {!audioEnabled && <span className="indicator muted"><MicOff size={16} /></span>}
                {!videoEnabled && <span className="indicator camera-off"><VideoOff size={16} /></span>}
              </div>
              {transcripts[socket?.id] && (
                <div className="video-transcript">
                  {transcripts[socket.id]}
                </div>
              )}
            </div>

            {/* Remote Videos */}
            {Array.from(remoteStreams.entries()).map(([userId, stream]) => {
              const participant = participants.find(p => p.socketId === userId)
              return (
                <div key={userId} className="video-container remote-video-container">
                  <RemoteVideo stream={stream} participant={participant} />
                  {transcripts[userId] && (
                    <div className="video-transcript">
                      {transcripts[userId]}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Media Controls */}
          <div className="media-controls glass-panel">
            <div className="controls-group primary">
              <button
                onClick={toggleAudio}
                className={`control-btn audio-btn ${audioEnabled ? 'active' : 'inactive'}`}
                title={audioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                <span className="control-icon">{audioEnabled ? <Mic size={24} /> : <MicOff size={24} />}</span>
              </button>
              <button
                onClick={toggleVideo}
                className={`control-btn video-btn ${videoEnabled ? 'active' : 'inactive'}`}
                title={videoEnabled ? 'Stop Video' : 'Start Video'}
              >
                <span className="control-icon">{videoEnabled ? <Video size={24} /> : <VideoOff size={24} />}</span>
              </button>
            </div>
            <div className="controls-group secondary">
              <button
                onClick={copyMeetingLink}
                className="control-btn copy-btn"
                title="Copy meeting link"
              >
                <span className="control-icon"><Copy size={20} /></span>
              </button>
              {isCurrentUserHost ? (
                <button
                  onClick={handleEndMeetingForAll}
                  className="control-btn end-meeting-all-btn"
                  title="End Meeting for All"
                >
                  <span className="control-icon"><PhoneOff size={24} /></span>
                  <span className="btn-text" style={{ marginLeft: '5px', fontSize: '12px', fontWeight: 'bold' }}>End for All</span>
                </button>
              ) : (
                <button
                  onClick={leaveCall}
                  className="control-btn end-call-btn"
                  title="Leave meeting"
                >
                  <span className="control-icon"><PhoneOff size={24} /></span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="sidebar">
          {/* AI Assistance Panel */}
          <div className="panel ai-panel glass-panel">
            <h3><HandMetal size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> AI Translation</h3>
            
            <div className="tts-toggle-container" style={{ margin: '10px 0', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px', fontSize: '13px', marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  checked={ttsEnabled}
                  onChange={(e) => setTtsEnabled(e.target.checked)}
                />
                Speak Detected Signs (TTS)
              </label>
              
              {userRole === 'standard' && (
                <div className="lang-select-container" style={{ marginTop: '8px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
                    Speech Accent/Language:
                  </label>
                  <select
                    value={transcribeLang}
                    onChange={handleLangChange}
                    style={{
                      width: '100%',
                      padding: '6px',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '12px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="es-ES">Spanish (Spain)</option>
                    <option value="es-MX">Spanish (Mexico)</option>
                    <option value="fr-FR">French (France)</option>
                    <option value="de-DE">German (Germany)</option>
                    <option value="ja-JP">Japanese (Japan)</option>
                    <option value="ar-SA">Arabic (Saudi Arabia)</option>
                    <option value="hi-IN">Hindi (India)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="ai-content-box">
              <TextToSignAnim transcript={currentSpeakerTranscript} />
            </div>
            {userRole === 'standard' && (
              <div className="detected-signs-list">
                <h4>Detected Signs:</h4>
                {detectedSigns.length === 0 && <p className="text-muted">Waiting for signs...</p>}
                {detectedSigns.map(ds => (
                  <div key={ds.id} className="detected-sign-item">
                    <strong>{ds.userName}:</strong> <span className="sign-badge">{ds.sign}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Participants */}
          <div className="panel participants-panel glass-panel">
            <h3><Users size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Participants ({participants.length + 1})</h3>
            <div className="participants-list">
              <div className="participant-item self">
                <span className="participant-name">
                  {user?.name} (You)
                  {user?.id === meetingHostId && <span className="host-badge" style={{ marginLeft: '6px', fontSize: '10px', background: '#3b82f6', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>Host</span>}
                </span>
                <span className="participant-role">{userRole}</span>
                <span className="status-dot connected"></span>
              </div>
              {participants.map(p => (
                <div key={p.socketId} className="participant-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="participant-name">
                      {p.userName}
                      {p.userId === meetingHostId && <span className="host-badge" style={{ marginLeft: '6px', fontSize: '10px', background: '#3b82f6', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>Host</span>}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`status-dot ${remoteStreams.has(p.socketId) ? 'connected' : 'connecting'}`}></span>
                      {isCurrentUserHost && p.userId !== meetingHostId && (
                        <div className="admin-actions" style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => handleAdminMute(p.socketId)}
                            className="admin-btn mute-btn"
                            title="Mute Participant"
                            style={{ background: 'rgba(239, 68, 68, 0.2)', border: 'none', borderRadius: '4px', color: '#f87171', padding: '3px 6px', cursor: 'pointer' }}
                          >
                            <MicOff size={12} />
                          </button>
                          <button
                            onClick={() => handleAdminKick(p.socketId)}
                            className="admin-btn kick-btn"
                            title="Remove Participant"
                            style={{ background: 'rgba(239, 68, 68, 0.2)', border: 'none', borderRadius: '4px', color: '#f87171', padding: '3px 6px', cursor: 'pointer' }}
                          >
                            <PhoneOff size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="participant-role">{p.role}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

/**
 * Remote Video Component
 */
function RemoteVideo({ stream, participant }) {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="video-element"
      />
      <div className="video-label">
        <span className="user-name">{participant?.userName}</span>
        <span className="user-role">{participant?.role}</span>
      </div>
    </>
  )
}

