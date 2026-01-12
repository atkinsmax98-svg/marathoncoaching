import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import InviteModal from '../components/Dashboard/InviteModal'

export default function Athletes() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [athletes, setAthletes] = useState([])
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)

  useEffect(() => {
    if (user.role !== 'coach') {
      navigate('/')
      return
    }
    loadData()
  }, [user, navigate])

  const loadData = async () => {
    try {
      const [athletesRes, invitesRes] = await Promise.all([
        api.get('/athletes'),
        api.get('/invites')
      ])
      setAthletes(athletesRes.data)
      setInvites(invitesRes.data.filter(i => !i.used))
    } catch (err) {
      console.error('Failed to load athletes:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInviteSent = () => {
    setInviteModalOpen(false)
    loadData()
  }

  const handleDeleteInvite = async (inviteId) => {
    if (!confirm('Cancel this invite?')) return
    try {
      await api.delete(`/invites/${inviteId}`)
      loadData()
    } catch (err) {
      console.error('Failed to delete invite:', err)
    }
  }

  const handleRemoveAthlete = async (athleteId, name) => {
    if (!confirm(`Remove ${name} from your team? They will no longer see their training plans.`)) return
    try {
      await api.delete(`/athletes/${athleteId}`)
      loadData()
    } catch (err) {
      console.error('Failed to remove athlete:', err)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading athletes...
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>Athletes</h2>
        <button className="btn btn-primary" onClick={() => setInviteModalOpen(true)}>
          + Invite Athlete
        </button>
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 className="card-title" style={{ marginBottom: '16px' }}>Pending Invites</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {invites.map(invite => (
              <div
                key={invite.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: '#fffbeb',
                  borderRadius: '6px',
                  border: '1px solid #fcd34d'
                }}
              >
                <div>
                  <span style={{ fontWeight: 500 }}>{invite.email}</span>
                  <span style={{ color: '#92400e', fontSize: '13px', marginLeft: '12px' }}>
                    Expires {new Date(invite.expires_at).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`http://localhost:5173/register?invite=${invite.token}`)
                      alert('Invite link copied!')
                    }}
                  >
                    Copy Link
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{ background: '#fecaca', color: '#991b1b' }}
                    onClick={() => handleDeleteInvite(invite.id)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Athletes Grid */}
      {athletes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <p style={{ color: '#718096', marginBottom: '16px' }}>
            No athletes yet. Invite your first athlete to get started.
          </p>
          <button className="btn btn-primary" onClick={() => setInviteModalOpen(true)}>
            Invite Athlete
          </button>
        </div>
      ) : (
        <div className="athletes-grid">
          {athletes.map(athlete => (
            <div key={athlete.id} className="athlete-card" onClick={() => navigate(`/athletes/${athlete.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="athlete-name">{athlete.name}</div>
                {athlete.garmin_connected && (
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    background: '#c6f6d5',
                    color: '#276749',
                    borderRadius: '10px'
                  }}>
                    Garmin
                  </span>
                )}
              </div>
              <div className="athlete-meta">{athlete.email}</div>
              <div className="athlete-stats">
                <div>
                  <span style={{ fontWeight: 600 }}>{athlete.completed_runs}</span>
                  <span style={{ color: '#718096', fontSize: '12px' }}> / {athlete.total_runs} runs</span>
                </div>
                <button
                  className="btn btn-sm btn-secondary"
                  style={{ marginLeft: 'auto' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveAthlete(athlete.id, athlete.name)
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {inviteModalOpen && (
        <InviteModal
          onClose={() => setInviteModalOpen(false)}
          onSuccess={handleInviteSent}
        />
      )}
    </div>
  )
}
