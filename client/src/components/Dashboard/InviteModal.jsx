import { useState } from 'react'
import api from '../../services/api'

export default function InviteModal({ onClose, onSuccess }) {
  const [email, setEmail] = useState('')
  const [inviteUrl, setInviteUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.post('/invites', { email })
      setInviteUrl(res.data.invite_url)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create invite')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl)
    alert('Invite link copied to clipboard!')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Invite Athlete</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {inviteUrl ? (
          <div>
            <div className="alert alert-success">
              Invite created! Share this link with your athlete.
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Invite Link</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  value={inviteUrl}
                  readOnly
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary" onClick={handleCopy}>
                  Copy
                </button>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#718096', marginBottom: '16px' }}>
              This invite link will expire in 7 days. The athlete should use this link to create their account.
            </p>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
              <button className="btn btn-primary" onClick={onSuccess}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Athlete Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="athlete@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <p style={{ fontSize: '13px', color: '#718096', marginBottom: '16px' }}>
              An invite link will be generated for this email address. Share it with your athlete so they can create their account and join your team.
            </p>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Invite'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
