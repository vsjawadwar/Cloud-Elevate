import { Link } from 'react-router-dom'
import Navbar from '@/components/Navbar'

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
        <div className="text-8xl font-bold text-slate-800 mb-4">404</div>
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-slate-400 mb-8 max-w-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-3">
          <Link to="/" className="btn-primary">Go Home</Link>
          <Link to="/courses" className="btn-secondary">Browse Courses</Link>
        </div>
      </div>
    </div>
  )
}
