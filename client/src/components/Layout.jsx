import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Running Coach</h1>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/calendar">Calendar</NavLink>
          {user?.role === 'coach' && (
            <NavLink to="/athletes">Athletes</NavLink>
          )}
          <NavLink to="/settings">Settings</NavLink>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </nav>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
