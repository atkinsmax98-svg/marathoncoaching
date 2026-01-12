import { useState, useEffect, useCallback } from 'react'
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import enUS from 'date-fns/locale/en-US'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import RunModal from '../components/Calendar/RunModal'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales
})

export default function Calendar() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [athletes, setAthletes] = useState([])
  const [selectedAthlete, setSelectedAthlete] = useState('')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)

  useEffect(() => {
    if (user.role === 'coach') {
      api.get('/athletes').then(res => setAthletes(res.data))
    }
  }, [user])

  useEffect(() => {
    loadRuns()
  }, [currentDate, selectedAthlete])

  const loadRuns = async () => {
    setLoading(true)
    try {
      const start = startOfMonth(subMonths(currentDate, 1))
      const end = endOfMonth(addMonths(currentDate, 1))

      const params = {
        start_date: format(start, 'yyyy-MM-dd'),
        end_date: format(end, 'yyyy-MM-dd')
      }

      if (selectedAthlete) {
        params.athlete_id = selectedAthlete
      }

      const res = await api.get('/runs', { params })

      const calendarEvents = res.data.map(run => {
        // Parse date as local time (not UTC) to avoid timezone shift
        const [year, month, day] = run.date.split('T')[0].split('-').map(Number)
        const localDate = new Date(year, month - 1, day)
        return {
          id: run.id,
          title: `${run.title}${run.distance_km ? ` (${run.distance_km}km)` : ''}`,
          start: localDate,
          end: localDate,
          allDay: true,
          resource: run
        }
      })

      setEvents(calendarEvents)
    } catch (err) {
      console.error('Failed to load runs:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectSlot = useCallback((slotInfo) => {
    if (user.role !== 'coach') return
    setSelectedSlot(slotInfo)
    setSelectedEvent(null)
    setModalOpen(true)
  }, [user])

  const handleSelectEvent = useCallback((event) => {
    setSelectedEvent(event.resource)
    setSelectedSlot(null)
    setModalOpen(true)
  }, [])

  const handleNavigate = useCallback((date) => {
    setCurrentDate(date)
  }, [])

  const handleSave = async (runData) => {
    try {
      if (selectedEvent) {
        await api.put(`/runs/${selectedEvent.id}`, runData)
      } else {
        await api.post('/runs', runData)
      }
      setModalOpen(false)
      loadRuns()
    } catch (err) {
      console.error('Failed to save run:', err)
      throw err
    }
  }

  const handleDelete = async () => {
    if (!selectedEvent) return
    try {
      await api.delete(`/runs/${selectedEvent.id}`)
      setModalOpen(false)
      loadRuns()
    } catch (err) {
      console.error('Failed to delete run:', err)
    }
  }

  const handleToggleComplete = async () => {
    if (!selectedEvent) return
    try {
      await api.put(`/runs/${selectedEvent.id}`, {
        completed: !selectedEvent.completed
      })
      setModalOpen(false)
      loadRuns()
    } catch (err) {
      console.error('Failed to toggle completion:', err)
    }
  }

  const eventStyleGetter = (event) => {
    const run = event.resource
    const colors = {
      easy: '#48bb78',
      tempo: '#ecc94b',
      interval: '#ed8936',
      long: '#4299e1',
      recovery: '#9f7aea',
      race: '#f56565'
    }

    return {
      className: `run-${run.run_type}${run.completed ? ' completed' : ''}`,
      style: {
        backgroundColor: colors[run.run_type] || '#a0aec0',
        border: 'none',
        opacity: run.completed ? 0.6 : 1
      }
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2>Training Calendar</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {user.role === 'coach' && athletes.length > 0 && (
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: '180px' }}
              value={selectedAthlete}
              onChange={(e) => setSelectedAthlete(e.target.value)}
            >
              <option value="">All Athletes</option>
              {athletes.map(athlete => (
                <option key={athlete.id} value={athlete.id}>{athlete.name}</option>
              ))}
            </select>
          )}
          {user.role === 'coach' && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setSelectedSlot({ start: new Date() })
                setSelectedEvent(null)
                setModalOpen(true)
              }}
            >
              + Add Run
            </button>
          )}
        </div>
      </div>

      <div style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}>
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          onNavigate={handleNavigate}
          selectable={user.role === 'coach'}
          eventPropGetter={eventStyleGetter}
          views={['month', 'week', 'day']}
          defaultView="month"
          popup
          style={{ height: '100%' }}
        />
      </div>

      {modalOpen && (
        <RunModal
          run={selectedEvent}
          date={selectedSlot?.start}
          athletes={athletes}
          selectedAthleteId={selectedAthlete}
          isCoach={user.role === 'coach'}
          onSave={handleSave}
          onDelete={handleDelete}
          onToggleComplete={handleToggleComplete}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
