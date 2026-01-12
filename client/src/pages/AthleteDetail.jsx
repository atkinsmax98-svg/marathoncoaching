import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

export default function AthleteDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [athlete, setAthlete] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAthlete()
  }, [id])

  const loadAthlete = async () => {
    try {
      const res = await api.get(`/athletes/${id}`)
      setAthlete(res.data)
    } catch (err) {
      console.error('Failed to load athlete:', err)
      if (err.response?.status === 404 || err.response?.status === 403) {
        navigate('/athletes')
      }
    } finally {
      setLoading(false)
    }
  }

  const formatPace = (minPerKm) => {
    if (!minPerKm) return '-'
    const mins = Math.floor(minPerKm)
    const secs = Math.round((minPerKm - mins) * 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading athlete...
      </div>
    )
  }

  if (!athlete) {
    return <div>Athlete not found</div>
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/athletes" style={{ color: '#4299e1', textDecoration: 'none', fontSize: '14px' }}>
          &larr; Back to Athletes
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ marginBottom: '4px' }}>{athlete.name}</h2>
          <p style={{ color: '#718096' }}>{athlete.email}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {athlete.garmin_connected && (
            <span style={{
              fontSize: '13px',
              padding: '6px 12px',
              background: '#c6f6d5',
              color: '#276749',
              borderRadius: '6px'
            }}>
              Garmin Connected
            </span>
          )}
          <Link to={`/calendar?athlete=${id}`} className="btn btn-primary">
            View Calendar
          </Link>
        </div>
      </div>

      {/* Weekly Stats */}
      {athlete.weekly_stats && athlete.weekly_stats.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 className="card-title" style={{ marginBottom: '16px' }}>Weekly Stats (from Garmin)</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '12px 8px', color: '#718096', fontWeight: 500 }}>Week</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', color: '#718096', fontWeight: 500 }}>Distance</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', color: '#718096', fontWeight: 500 }}>Runs</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', color: '#718096', fontWeight: 500 }}>Avg Pace</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', color: '#718096', fontWeight: 500 }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {athlete.weekly_stats.map((stat, index) => (
                  <tr key={stat.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 8px' }}>
                      {new Date(stat.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {index === 0 && <span style={{ color: '#4299e1', marginLeft: '8px', fontSize: '12px' }}>Current</span>}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 600 }}>
                      {stat.total_distance_km} km
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 8px' }}>
                      {stat.total_runs}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 8px' }}>
                      {formatPace(stat.avg_pace_min_km)} /km
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 8px' }}>
                      {Math.round(stat.total_time_minutes / 60 * 10) / 10} hrs
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upcoming Runs */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Upcoming Runs</h3>
          <Link
            to={`/calendar?athlete=${id}`}
            className="btn btn-secondary btn-sm"
          >
            Add Run
          </Link>
        </div>

        {athlete.upcoming_runs && athlete.upcoming_runs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {athlete.upcoming_runs.map(run => (
              <div
                key={run.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  background: run.completed ? '#f0fff4' : '#f7fafc',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${getRunColor(run.run_type)}`
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {run.title}
                    {run.completed && (
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '12px',
                        color: '#276749',
                        background: '#c6f6d5',
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        Completed
                      </span>
                    )}
                  </div>
                  {run.notes && (
                    <div style={{ fontSize: '13px', color: '#718096', marginTop: '4px' }}>
                      {run.notes}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 500 }}>{formatDate(run.date)}</div>
                  {run.distance_km && (
                    <div style={{ fontSize: '14px', color: '#718096' }}>
                      {run.distance_km} km
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#718096' }}>No upcoming runs scheduled.</p>
        )}
      </div>
    </div>
  )
}

function getRunColor(type) {
  const colors = {
    easy: '#48bb78',
    tempo: '#ecc94b',
    interval: '#ed8936',
    long: '#4299e1',
    recovery: '#9f7aea',
    race: '#f56565'
  }
  return colors[type] || '#a0aec0'
}
