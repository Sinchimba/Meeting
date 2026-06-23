import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Rocket, Phone, Video, Mic, HeartHandshake, MessageSquare, Link as LinkIcon, Shield, ArrowRight, Sparkles } from 'lucide-react'
import './Landing.css'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav glass-panel">
        <div className="nav-container">
          <h1 className="nav-logo gradient-text">
            <Users size={24} style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }} />
            Smart Meeting
          </h1>
          <div className="nav-buttons">
            <button onClick={() => navigate('/login')} className="nav-btn login-btn">
              sign in
            </button>
            <button onClick={() => navigate('/register')} className="nav-btn register-btn">
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Real-Time Communication <span className="gradient-text">for Everyone</span>
          </h1>
          <p className="hero-subtitle">
            Bridge the gap between hearing and deaf/mute communities with live sign language conversion and smart speech translation.
          </p>
          <div className="hero-buttons">
            <button onClick={() => navigate('/register')} className="btn btn-primary btn-large">
              <Rocket size={20} /> Get Started
            </button>
            <button onClick={() => navigate('/login')} className="btn btn-secondary btn-large glass-panel-btn">
              <Phone size={20} /> Join Meeting
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <h2>Why Choose Smart Meeting?</h2>
        <div className="features-grid">
          <div className="feature-card glass-panel">
            <div className="feature-icon"><Video size={40} className="gradient-icon" /></div>
            <h3>High-Quality Video</h3>
            <p>Crystal clear video with HD quality for seamless communication.</p>
          </div>

          <div className="feature-card glass-panel">
            <div className="feature-icon"><Mic size={40} className="gradient-icon" /></div>
            <h3>Clear Audio</h3>
            <p>Professional-grade audio with smart noise reduction.</p>
          </div>

          <div className="feature-card glass-panel">
            <div className="feature-icon"><HeartHandshake size={40} className="gradient-icon" /></div>
            <h3>Sign Language Support</h3>
            <p>Dedicated AI support for sign language users with an optimized interface.</p>
          </div>

          <div className="feature-card glass-panel">
            <div className="feature-icon"><MessageSquare size={40} className="gradient-icon" /></div>
            <h3>Live Translations</h3>
            <p>Real-time text captions and animated sign language equivalents.</p>
          </div>

          <div className="feature-card glass-panel">
            <div className="feature-icon"><LinkIcon size={40} className="gradient-icon" /></div>
            <h3>Share Meeting Links</h3>
            <p>Easily invite others by sharing unique secure meeting codes.</p>
          </div>

          <div className="feature-card glass-panel">
            <div className="feature-icon"><Shield size={40} className="gradient-icon" /></div>
            <h3>Secure & Private</h3>
            <p>End-to-end encrypted meetings with full privacy control.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps-container">
          <div className="step glass-panel">
            <div className="step-number">1</div>
            <h3>Create Account</h3>
            <p>Sign up with your email and choose your role.</p>
          </div>

          <div className="arrow"><ArrowRight size={32} /></div>

          <div className="step glass-panel">
            <div className="step-number">2</div>
            <h3>Create or Join</h3>
            <p>Start a new meeting or join using an invite link.</p>
          </div>

          <div className="arrow"><ArrowRight size={32} /></div>

          <div className="step glass-panel">
            <div className="step-number">3</div>
            <h3>Connect & Share</h3>
            <p>Enable your camera/mic and start communicating.</p>
          </div>

          <div className="arrow"><ArrowRight size={32} /></div>

          <div className="step glass-panel">
            <div className="step-number">4</div>
            <h3>AI Translation</h3>
            <p>Let our AI bridge the communication gap automatically.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content glass-panel">
          <h2>Ready to Connect?</h2>
          <p>Join thousands of users experiencing seamless, inclusive communication.</p>
          <button onClick={() => navigate('/register')} className="btn btn-primary btn-large">
            <Sparkles size={20} /> Create Your Account Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>&copy; 2024 Smart Meeting Platform. Making communication accessible for everyone.</p>
      </footer>
    </div>
  )
}
