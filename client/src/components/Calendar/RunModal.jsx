import { useState, useEffect } from 'react'

const RUN_TYPES = [
  { value: 'easy', label: 'Easy Run', color: '#48bb78' },
  { value: 'tempo', label: 'Tempo Run', color: '#ecc94b' },
  { value: 'interval', label: 'Interval Training', color: '#ed8936' },
  { value: 'long', label: 'Long Run', color: '#4299e1' },
  { value: 'recovery', label: 'Recovery Run', color: '#9f7aea' },
  { value: 'race', label: 'Race', color: '#f56565' }
]

export default function RunModal({
  run,
  date,
  athletes,
  selectedAthleteId,
  isCoach,
  onSave,
  onDelete,
  onToggleComplete,
  onClose
}) {
  const [formData, setFormData] = useState({
    athlete_id: selectedAthleteId || '',
    date: '',
    title: '',
    run_type: 'easy',
    distance_km: '',
    notes: ''
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (run) {
      setFormData({
        athlete_id: run.athlete_id,
        date: run.date.split('T')[0],
        title: run.title,
        run_type: run.run_type,
        distance_km: run.distance_km || '',
        notes: run.notes || ''
      })
    } else if (date) {
      setFormData(prev => ({
        ...prev,
        date: formatDateForInput(date),
        athlete_id: selectedAthleteId || ''
      }))
    }
  }, [run, date, selectedAthleteId])

  const formatDateForInput = (d) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      await onSave({
        ...formData,
        distance_km: formData.distance_km ? parseFloat(formData.distance_km) : null
      })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save run')
    } finally {
      setSaving(false)
    }
  }

  const isEditing = !!run

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {isEditing ? (isCoach ? 'Edit Run' : 'Run Details') : 'Add Run'}
          </h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {isCoach ? (
          <form onSubmit={handleSubmit}>
            {athletes.length > 0 && (
              <div className="form-group">
                <label className="form-label">Athlete</label>
                <select
                  name="athlete_id"
                  className="form-select"
                  value={formData.athlete_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select athlete...</option>
                  {athletes.map(athlete => (
                    <option key={athlete.id} value={athlete.id}>{athlete.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                name="date"
                className="form-input"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                type="text"
                name="title"
                className="form-input"
                placeholder="e.g., Morning Easy Run"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Run Type</label>
              <select
                name="run_type"
                className="form-select"
                value={formData.run_type}
                onChange={handleChange}
              >
                {RUN_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Distance (km)</label>
              <input
                type="number"
                name="distance_km"
                className="form-input"
                placeholder="e.g., 10"
                step="0.1"
                min="0"
                value={formData.distance_km}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                name="notes"
                className="form-input"
                rows="3"
                placeholder="Training notes for the athlete..."
                value={formData.notes}
                onChange={handleChange}
              />
            </div>

            <div className="modal-footer">
              {isEditing && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={onDelete}
                >
                  Delete
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Run'}
              </button>
            </div>
          </form>
        ) : (
          // Athlete view - read only with completion toggle
          <div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '4px',
                background: RUN_TYPES.find(t => t.value === run?.run_type)?.color || '#a0aec0',
                color: run?.run_type === 'tempo' ? '#1a202c' : 'white',
                fontSize: '13px',
                fontWeight: 500
              }}>
                {RUN_TYPES.find(t => t.value === run?.run_type)?.label || 'Run'}
              </div>
            </div>

            <h4 style={{ fontSize: '20px', marginBottom: '8px' }}>{run?.title}</h4>

            <p style={{ color: '#718096', marginBottom: '16px' }}>
              {(() => {
                const [year, month, day] = (run?.date || '').split('T')[0].split('-').map(Number)
                return new Date(year, month - 1, day).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })
              })()}
            </p>

            {run?.distance_km && (
              <p style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px' }}>
                {run.distance_km} km
              </p>
            )}

            {run?.notes && (
              <div style={{ background: '#f7fafc', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                <p style={{ fontWeight: 500, marginBottom: '4px' }}>Coach Notes:</p>
                <p style={{ color: '#4a5568' }}>{run.notes}</p>
              </div>
            )}

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
              <button
                type="button"
                className={`btn ${run?.completed ? 'btn-secondary' : 'btn-primary'}`}
                onClick={onToggleComplete}
              >
                {run?.completed ? 'Mark Incomplete' : 'Mark Complete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
