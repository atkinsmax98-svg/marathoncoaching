import { useState } from 'react'

export default function GarminLoginModal({ isOpen, onClose, onConnect }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await onConnect(username, password)
      setUsername('')
      setPassword('')
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to connect to Garmin')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setUsername('')
    setPassword('')
    setError('')
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3>Connect to Garmin</h3>
          <button className="modal-close" onClick={handleClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p style={{ fontSize: '14px', color: '#718096', marginBottom: '16px' }}>
              Enter your Garmin Connect credentials to sync your running data.
            </p>

            {error && (
              <div style={{
                background: '#fed7d7',
                border: '1px solid #fc8181',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '16px',
                color: '#c53030',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="garmin-email">Email</label>
              <input
                id="garmin-email"
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your-email@example.com"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="garmin-password">Password</label>
              <input
                id="garmin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your Garmin password"
                required
                disabled={loading}
              />
            </div>

            <div style={{
              background: '#fffaf0',
              border: '1px solid #fbd38d',
              borderRadius: '6px',
              padding: '12px',
              marginTop: '16px',
              fontSize: '13px',
              color: '#744210'
            }}>
              <strong>Note:</strong> MFA-enabled Garmin accounts are not supported. Your credentials are encrypted and stored securely.
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !username || !password}
            >
              {loading ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
