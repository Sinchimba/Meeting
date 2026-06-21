import React, { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Users, ArrowLeft, Sparkles } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import './Auth.css'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const login = useAuthStore((state) => state.login)
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
      if (!formData.email || !formData.password) {
        throw new Error('Email and password are required')
      }

      await login(formData.email, formData.password)

      const from = location.state?.from 
        ? location.state.from.pathname + location.state.from.search 
        : '/home'
      navigate(from, { replace: true })
    } catch (err) {
      console.error('Login error:', err)
      if (err.response) {
        setError(err.response.data?.error || `Server error: ${err.response.status}`)
      } else if (err.request) {
        setError('Network Error: Cannot reach backend. Check backend URL, server availability, and that the backend server is running.')
      } else if (err.code === 'ECONNABORTED') {
        setError('Request timeout. Backend server is not responding.')
      } else {
        setError(err.message || 'An error occurred during login')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo"><Users size={48} className="gradient-icon" /></div>
          <h2 className="gradient-text">Welcome Back</h2>
          <p className="subtitle">Sign in to your Smart Meeting account</p>
        </div>

        {(error || authError) && <div className="error-message">{error || authError}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
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
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password"><Lock size={16} /> Password</label>
            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
                className="form-input"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Signing in...' : <><Sparkles size={18} /> Sign In</>}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <p className="auth-link">
          Don't have an account? <Link to="/register" className="link">Create one</Link>
        </p>

        <p className="auth-back">
          <Link to="/" className="link"><ArrowLeft size={16} /> Back to Home</Link>
        </p>
      </div>
    </div>
  )
}
