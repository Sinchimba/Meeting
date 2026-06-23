import './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuthStore } from './stores/authStore'
import Landing from './pages/Landing'
import HomePage from './pages/HomePage'
import MeetingRoom from './pages/MeetingRoom'
import Login from './pages/Login'
import Register from './pages/Register'
import SmsDashboard from './pages/SmsDashboard'

// Protected Route Component
function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const loadUserFromToken = useAuthStore((state) => state.loadUserFromToken)
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  useEffect(() => {
    const checkAuth = async () => {
      await loadUserFromToken()
      setLoading(false)
    }
    checkAuth()
  }, [loadUserFromToken])

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/meeting/:meetingId" element={<ProtectedRoute><MeetingRoom /></ProtectedRoute>} />
          <Route path="/admin/sms" element={<ProtectedRoute><SmsDashboard /></ProtectedRoute>} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
