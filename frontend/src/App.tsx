import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/lib/store/authStore'
import { api } from '@/lib/api'

// Pages
import Landing        from '@/pages/Landing'
import Login          from '@/pages/Login'
import Register       from '@/pages/Register'
import Courses        from '@/pages/Courses'
import CourseDetail   from '@/pages/CourseDetail'
import Checkout       from '@/pages/Checkout'
import Dashboard      from '@/pages/Dashboard'
import CourseLearning from '@/pages/CourseLearning'
import Quiz           from '@/pages/Quiz'
import QuizResult     from '@/pages/QuizResult'
import Certificate    from '@/pages/Certificate'
import AdminLayout    from '@/pages/admin/AdminLayout'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminStudents  from '@/pages/admin/AdminStudents'
import AdminCourses   from '@/pages/admin/AdminCourses'
import Profile        from '@/pages/Profile'
import NotFound       from '@/pages/NotFound'

// Restore auth state from token on every page load
function useInitAuth() {
  const { token, setAuth, clearAuth, setReady } = useAuthStore()

  useEffect(() => {
    if (!token) {
      setReady(true)
      return
    }
    api.get('/api/auth/me')
      .then(({ data }) => {
        // Decode isAdmin from the JWT payload (middle section)
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          setAuth(data.user, token, payload.isAdmin ?? false)
        } catch {
          setAuth(data.user, token, false)
        }
      })
      .catch(() => {
        // Token is expired or invalid — log out silently
        clearAuth()
      })
  }, []) // run once on mount
}

// Route guards
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, ready } = useAuthStore()
  if (!ready) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading…</div>
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, ready } = useAuthStore()
  if (!ready) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading…</div>
  if (!user)    return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  useInitAuth()

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/"               element={<Landing />} />
      <Route path="/login"          element={<Login />} />
      <Route path="/register"       element={<Register />} />
      <Route path="/courses"        element={<Courses />} />
      <Route path="/courses/:id"    element={<CourseDetail />} />

      {/* Protected student routes */}
      <Route path="/checkout/:courseId" element={<PrivateRoute><Checkout /></PrivateRoute>} />
      <Route path="/dashboard"          element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/learn/:courseId"    element={<PrivateRoute><CourseLearning /></PrivateRoute>} />
      <Route path="/quiz/:quizId"       element={<PrivateRoute><Quiz /></PrivateRoute>} />
      <Route path="/quiz/:quizId/result/:attemptId" element={<PrivateRoute><QuizResult /></PrivateRoute>} />
      <Route path="/certificate/:enrollmentId"      element={<PrivateRoute><Certificate /></PrivateRoute>} />
      <Route path="/profile"                        element={<PrivateRoute><Profile /></PrivateRoute>} />

      {/* Admin routes */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index           element={<AdminDashboard />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="courses"  element={<AdminCourses />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
