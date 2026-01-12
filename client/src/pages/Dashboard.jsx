import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

export default function Dashboard() {
  const { user } = useAuth()
  const [athletes, setAthletes] = useState([])
  const [stats, setStats] = useState([])
  const [upcomingRuns, setUpcomingRuns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [user])

  const loadDashboard = async () => {
    try {
      if (user.role === 'coach') {
        const [athletesRes, runsRes] = await Promise.all([
          api.get('/athletes'),
          api.get('/runs', {
            params: {
              start_date: new Date().toISOString().split('T')[0],
              end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            }
          })
        ])
        setAthletes(athletesRes.data)
        setUpcomingRuns(runsRes.data)
      } else {
        const [statsRes, runsRes] = await Promise.all([
          api.get('/garmin/stats/weekly'),
          api.get('/runs', {
            params: {
              start_date: new Date().toISOString().split('T')[0],
              end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            }
          })
        ])
        setStats(statsRes.data)
        setUpcomingRuns(runsRes.data)
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err)
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
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading dashboard...
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ marginBottom: '24px' }}>
        Welcome back, {user.name}
      </h2>

      {user.role === 'coach' ? (
        <>
          {/* Coach Dashboard */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Athletes</div>
              <div className="stat-value">{athletes.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Runs This Week</div>
              <div className="stat-value">{upcomingRuns.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Garmin Connected</div>
              <div className="stat-value">
                {athletes.filter(a => a.garmin_connected).length}
                <span className="stat-unit">/ {athletes.length}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Your Athletes</h3>
                <Link to="/athletes" className="btn btn-secondary btn-sm">View All</Link>
              </div>
              {athletes.length === 0 ? (
                <p style={{ color: '#718096' }}>No athletes yet. Invite your first athlete from the Athletes page.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {athletes.slice(0, 5).map(athlete => (
                    <Link
                      key={athlete.id}
                      to={`/athletes/${athlete.id}`}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        background: '#f7fafc',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        color: 'inherit'
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{athlete.name}</span>
                      <span style={{ fontSize: '13px', color: '#718096' }}>
                        {athlete.completed_runs}/{athlete.total_runs} runs completed
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Upcoming Runs</h3>
                <Link to="/calendar" className="btn btn-secondary btn-sm">Calendar</Link>
              </div>
              {upcomingRuns.length === 0 ? (
                <p style={{ color: '#718096' }}>No runs scheduled for the upcoming week.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {upcomingRuns.slice(0, 6).map(run => (
                    <div
                      key={run.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        background: run.completed ? '#f0fff4' : '#f7fafc',
                        borderRadius: '6px',
                        borderLeft: `3px solid ${getRunColor(run.run_type)}`
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '14px' }}>{run.title}</div>
                        <div style={{ fontSize: '12px', color: '#718096' }}>{run.athlete_name}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', color: '#4a5568' }}>{formatDate(run.date)}</div>
                        {run.distance_km && (
                          <div style={{ fontSize: '12px', color: '#718096' }}>{run.distance_km} km</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Athlete Dashboard */}
          {stats.length > 0 && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">This Week Distance</div>
                <div className="stat-value">
                  {stats[0]?.total_distance_km || 0}
                  <span className="stat-unit">km</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Runs Completed</div>
                <div className="stat-value">{stats[0]?.total_runs || 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Average Pace</div>
                <div className="stat-value">
                  {formatPace(stats[0]?.avg_pace_min_km)}
                  <span className="stat-unit">/km</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Time</div>
                <div className="stat-value">
                  {Math.round((stats[0]?.total_time_minutes || 0) / 60 * 10) / 10}
                  <span className="stat-unit">hrs</span>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Upcoming Runs</h3>
              <Link to="/calendar" className="btn btn-secondary btn-sm">View Calendar</Link>
            </div>
            {upcomingRuns.length === 0 ? (
              <p style={{ color: '#718096' }}>No runs scheduled. Your coach will add your training plan.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {upcomingRuns.map(run => (
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
                      <div style={{ fontWeight: 600 }}>{run.title}</div>
                      {run.notes && <div style={{ fontSize: '13px', color: '#718096', marginTop: '4px' }}>{run.notes}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 500 }}>{formatDate(run.date)}</div>
                      {run.distance_km && <div style={{ fontSize: '14px', color: '#718096' }}>{run.distance_km} km</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
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
