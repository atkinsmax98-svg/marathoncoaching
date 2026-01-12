import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

export default function Settings() {
  const { user } = useAuth()
  const [garminStatus, setGarminStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    loadGarminStatus()
  }, [])

  const loadGarminStatus = async () => {
    try {
      const res = await api.get('/garmin/status')
      setGarminStatus(res.data)
    } catch (err) {
      console.error('Failed to load Garmin status:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectGarmin = async () => {
    setConnecting(true)
    try {
      await api.post('/garmin/connect')
      await loadGarminStatus()
    } catch (err) {
      console.error('Failed to connect Garmin:', err)
      alert(err.response?.data?.error || 'Failed to connect Garmin')
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnectGarmin = async () => {
    if (!confirm('Disconnect your Garmin account? Your weekly stats will be preserved.')) return
    try {
      await api.post('/garmin/disconnect')
      await loadGarminStatus()
    } catch (err) {
      console.error('Failed to disconnect Garmin:', err)
    }
  }

  const handleRefreshStats = async () => {
    setSyncing(true)
    try {
      await api.post('/garmin/refresh')
      alert('Stats refreshed from Garmin!')
    } catch (err) {
      console.error('Failed to refresh stats:', err)
      alert(err.response?.data?.error || 'Failed to refresh stats')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading settings...
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '600px' }}>
      <h2 style={{ marginBottom: '24px' }}>Settings</h2>

      {/* Account Info */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 className="card-title" style={{ marginBottom: '16px' }}>Account</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '13px', color: '#718096' }}>Name</label>
            <p style={{ fontWeight: 500 }}>{user.name}</p>
          </div>
          <div>
            <label style={{ fontSize: '13px', color: '#718096' }}>Email</label>
            <p style={{ fontWeight: 500 }}>{user.email}</p>
          </div>
          <div>
            <label style={{ fontSize: '13px', color: '#718096' }}>Role</label>
            <p style={{ fontWeight: 500, textTransform: 'capitalize' }}>{user.role}</p>
          </div>
        </div>
      </div>

      {/* Garmin Connection */}
      <div className={`garmin-card ${garminStatus?.connected ? 'connected' : ''}`} style={{ marginBottom: '24px' }}>
        <div className="garmin-logo">G</div>
        <div style={{ flex: 1 }}>
          <h4 style={{ marginBottom: '4px' }}>Garmin Connect</h4>
          <p style={{ fontSize: '13px', opacity: 0.9 }}>
            {garminStatus?.connected
              ? `Connected since ${new Date(garminStatus.connected_at).toLocaleDateString()}`
              : 'Connect to sync your running stats'
            }
          </p>
        </div>
        {garminStatus?.connected ? (
          <button
            className="btn"
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
            onClick={handleDisconnectGarmin}
          >
            Disconnect
          </button>
        ) : (
          <button
            className="btn"
            style={{ background: 'white', color: '#1a365d' }}
            onClick={handleConnectGarmin}
            disabled={connecting}
          >
            {connecting ? 'Connecting...' : 'Connect'}
          </button>
        )}
      </div>

      {/* Garmin Actions (when connected) */}
      {garminStatus?.connected && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 className="card-title" style={{ marginBottom: '16px' }}>Garmin Actions</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 500 }}>Refresh Weekly Stats</p>
                <p style={{ fontSize: '13px', color: '#718096' }}>
                  Pull latest running data from Garmin
                </p>
              </div>
              <button
                className="btn btn-secondary"
                onClick={handleRefreshStats}
                disabled={syncing}
              >
                {syncing ? 'Syncing...' : 'Refresh'}
              </button>
            </div>

            {user.role === 'athlete' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 500 }}>Sync Calendar to Garmin</p>
                  <p style={{ fontSize: '13px', color: '#718096' }}>
                    Push scheduled runs to your Garmin calendar
                  </p>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => api.post('/garmin/sync').then(() => alert('Calendar synced to Garmin!'))}
                >
                  Sync
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div style={{
        background: '#ebf8ff',
        border: '1px solid #90cdf4',
        borderRadius: '8px',
        padding: '16px',
        fontSize: '13px',
        color: '#2c5282'
      }}>
        <strong>Note:</strong> This is a demo app using mock Garmin data. In production, you would connect to the real Garmin Connect API using OAuth authentication.
      </div>
    </div>
  )
}
