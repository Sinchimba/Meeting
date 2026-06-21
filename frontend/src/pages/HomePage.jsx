import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { apiClient } from '../api/client'
import { LogOut, Video, PlusCircle, LogIn, Users, Mic, HandMetal } from 'lucide-react'
import './HomePage.css'

export default function HomePage() {
  const navigate = useNavigate()
  const [meetingCode, setMeetingCode] = useState('')
  const [showShareModal, setShowShareModal] = useState(false)
  const [createdMeeting, setCreatedMeeting] = useState(null)
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState('standard')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
  }, [])

  const createMeeting = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await apiClient.createMeeting('Meeting')
      const meeting = response
      setCreatedMeeting(meeting)
      setShowShareModal(true)
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to create meeting'
      setError(errorMsg)
      console.error('Create meeting error:', err)
    } finally {
      setLoading(false)
    }
  }

  const joinMeeting = () => {
    if (meetingCode) {
      let parsedCode = meetingCode.trim()
      // Extract code if the user pasted a full link/path
      if (parsedCode.includes('/meeting/')) {
        const parts = parsedCode.split('/meeting/')
        parsedCode = parts[parts.length - 1].split('?')[0]
      } else if (parsedCode.includes('/')) {
        const parts = parsedCode.split('/')
        parsedCode = parts[parts.length - 1].split('?')[0]
      }
      navigate(`/meeting/${parsedCode}?role=${userRole}`)
    } else {
      setError('Please enter a meeting code')
    }
  }

  const copyMeetingLink = () => {
    if (createdMeeting?.inviteLink) {
      navigator.clipboard.writeText(createdMeeting.inviteLink)
      alert('Meeting link copied to clipboard!')
    }
  }

  const [phone, setPhone] = useState('')
  const [smsLoading, setSmsLoading] = useState(false)
  const [smsError, setSmsError] = useState('')

  const sendSmsInvite = async () => {
    if (!createdMeeting) return
    if (!phone) {
      setSmsError('Please enter a phone number')
      return
    }
    try {
      setSmsLoading(true)
      setSmsError('')
      // Note: This endpoint may not be implemented on backend yet
      // Placeholder for future SMS functionality
      setSmsError('SMS functionality coming soon')
    } catch (err) {
      setSmsError(err.response?.data?.error || 'Failed to send SMS')
    } finally {
      setSmsLoading(false)
    }
  }

  const joinCreatedMeeting = () => {
    if (createdMeeting) {
      setShowShareModal(false)
      navigate(`/meeting/${createdMeeting.meetingId}?role=${userRole}`)
    }
  }

  const closeShareModal = () => {
    setShowShareModal(false)
    setCreatedMeeting(null)
  }

  const handleLogout = async () => {
    try {
      await apiClient.logout()
    } catch (err) {
      console.error('Logout error:', err)
    }
    navigate('/login')
  }

  return (
    <div className="home-page">
      <div className="home-header glass-panel">
        <h1 className="logo gradient-text">
          <Users size={28} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
          Smart Meeting Dashboard
        </h1>
        <div className="user-menu">
          {user && <div className="username-badge"><div className="avatar">{user.name.charAt(0).toUpperCase()}</div>{user.name}</div>}
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      <div className="dashboard-container">
        {error && <div className="error-message">{error}</div>}

        <div className="dashboard-grid">
          {/* Action Card: Create Meeting */}
          <div className="action-card glass-panel">
            <div className="card-icon-wrapper create-icon">
              <Video size={40} />
            </div>
            <h2>New Meeting</h2>
            <p>Start an instant meeting with AI translation capabilities.</p>
            
            <div className="role-selector">
              <p className="role-label">Join as:</p>
              <div className="role-options">
                <label className={`role-option ${userRole === 'standard' ? 'active' : ''}`}>
                  <input type="radio" value="standard" checked={userRole === 'standard'} onChange={(e) => setUserRole(e.target.value)} />
                  <Mic size={18} /> Standard User (Audio)
                </label>
                <label className={`role-option ${userRole === 'mute' ? 'active' : ''}`}>
                  <input type="radio" value="mute" checked={userRole === 'mute'} onChange={(e) => setUserRole(e.target.value)} />
                  <HandMetal size={18} /> Mute User (Sign Language)
                </label>
              </div>
            </div>

            <button onClick={createMeeting} className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Creating...' : <><PlusCircle size={20} /> Create Meeting</>}
            </button>
          </div>

          {/* Action Card: Join Meeting */}
          <div className="action-card glass-panel">
            <div className="card-icon-wrapper join-icon">
              <LogIn size={40} />
            </div>
            <h2>Join Meeting</h2>
            <p>Enter a meeting code provided by your host.</p>
            
            <div className="join-form">
              <input
                type="text"
                placeholder="Enter meeting code (e.g. abc-123)"
                value={meetingCode}
                onChange={(e) => setMeetingCode(e.target.value)}
                className="form-input code-input"
              />
              <button onClick={joinMeeting} className="btn btn-secondary btn-full" disabled={loading}>
                <LogIn size={20} /> Join Meeting
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Share Meeting Modal */}
      {showShareModal && createdMeeting && (
        <div className="modal-overlay" onClick={closeShareModal}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <h3>Meeting Created Successfully!</h3>
            <p>Your meeting is ready. Share this link with others:</p>
            
            <div className="share-link-container">
              <input
                type="text"
                value={createdMeeting.inviteLink}
                readOnly
                className="share-link-input"
              />
              <button onClick={copyMeetingLink} className="btn btn-secondary">
                Copy Link
              </button>
            </div>

            <div className="sms-invite">
              <p>Or send an SMS invite:</p>
              <div className="sms-form">
                <input
                  type="text"
                  placeholder="+25575234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-input"
                />
                <button onClick={sendSmsInvite} className="btn btn-secondary" disabled={smsLoading}>
                  {smsLoading ? 'Sending...' : 'Send SMS'}
                </button>
              </div>
              {smsError && <div className="error-message">{smsError}</div>}
            </div>

            <div className="meeting-details">
              <p><strong>Meeting Code:</strong> {createdMeeting.meetingId}</p>
              <p><strong>Title:</strong> {createdMeeting.title}</p>
            </div>

            <div className="modal-actions">
              <button onClick={closeShareModal} className="btn btn-outline">
                Close
              </button>
              <button onClick={joinCreatedMeeting} className="btn btn-primary">
                Join Meeting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
