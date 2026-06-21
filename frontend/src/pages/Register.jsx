import React, { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { User, Mail, Lock, CheckCircle, Settings, UserPlus } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import './Auth.css'

export default function Register() {
  const navigate = useNavigate()
  const location = useLocation()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'standard'
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const register = useAuthStore((state) => state.register)
  const authError = useAuthStore((state) => state.error)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validation
      if (!formData.name || !formData.email || !formData.password) {
        throw new Error('All fields are required')
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match')
      }

      if (formData.password.length < 8) {
        throw new Error('Password must be at least 8 characters with uppercase, lowercase, and number')
      }

      // Check password strength
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number')
      }

      await register(formData.name, formData.email, formData.password, formData.role)

      const from = location.state?.from 
        ? location.state.from.pathname + location.state.from.search 
        : '/home'
      navigate(from, { replace: true })
    } catch (err) {
      console.error('Registration error:', err)
      if (err.response) {
        // Server responded with error
        setError(err.response.data?.error || `Server error: ${err.response.status}`)
      } else if (err.request) {
        // Request was made but no response
        setError('Network Error: Cannot reach backend. Check backend URL, server availability, and that the backend server is running.')
      } else if (err.code === 'ECONNABORTED') {
        setError('Request timeout. Backend server is not responding.')
      } else {
        // Error in request setup
        setError(err.message || 'An error occurred during registration')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo"><UserPlus size={48} className="gradient-icon" /></div>
          <h2 className="gradient-text">Create Account</h2>
          <p className="subtitle">Join Smart Meeting Platform</p>
        </div>

        {(error || authError) && <div className="error-message">{error || authError}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name"><User size={16} /> Full Name</label>
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email"><Mail size={16} /> Email</label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password"><Lock size={16} /> Password</label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="At least 6 characters"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword"><CheckCircle size={16} /> Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter password"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="role"><Settings size={16} /> User Role</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="standard">Standard User (Audio/Speech)</option>
              <option value="mute">Mute User (Sign Language)</option>
              <option value="deaf">Deaf User (Text/Video)</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Creating account...' : <><UserPlus size={18} /> Sign Up</>}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  )
}
