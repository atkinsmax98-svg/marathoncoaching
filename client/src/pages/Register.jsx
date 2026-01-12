import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

export default function Register() {
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [inviteData, setInviteData] = useState(null)
  const [verifying, setVerifying] = useState(!!inviteToken)

  const { register, registerAthlete } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (inviteToken) {
      api.get(`/invites/verify/${inviteToken}`)
        .then(res => {
          setInviteData(res.data)
          setEmail(res.data.email)
        })
        .catch(err => {
          setError(err.response?.data?.error || 'Invalid invite link')
        })
        .finally(() => setVerifying(false))
    }
  }, [inviteToken])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (inviteToken) {
        await registerAthlete(email, password, name, inviteToken)
      } else {
        await register(email, password, name)
      }
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <div className="auth-container">
        <div className="loading">
          <div className="spinner"></div>
          Verifying invite...
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">
          {inviteData ? 'Join Your Coach' : 'Create Account'}
        </h1>
        <p className="auth-subtitle">
          {inviteData
            ? `${inviteData.coach_name} invited you to join their team`
            : 'Register as a running coach'
          }
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!inviteData}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {!inviteToken && (
          <p style={{ textAlign: 'center', marginTop: '24px', color: '#718096' }}>
            Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  )
}
