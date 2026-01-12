import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Calendar from './pages/Calendar'
import Athletes from './pages/Athletes'
import AthleteDetail from './pages/AthleteDetail'
import Settings from './pages/Settings'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  return children
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="athletes" element={<Athletes />} />
        <Route path="athletes/:id" element={<AthleteDetail />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
