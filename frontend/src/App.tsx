import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/lib/store/authStore'

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
import NotFound       from '@/pages/NotFound'

// Route guards
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthStore()
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
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

      {/* Admin routes */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index         element={<AdminDashboard />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="courses"  element={<AdminCourses />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
