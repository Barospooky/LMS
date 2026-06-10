import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Course from './pages/Course'
import Curriculum from './pages/Curriculum'
import Settings from './pages/Settings'
import ProtectedRoute from './components/ProtectedRoute'
import RoleRoute from './components/RoleRoute'
import AdminLayout from './pages/admin/AdminLayout'
import AdminOverview from './pages/admin/AdminOverview'
import CourseManager from './pages/admin/CourseManager'
import UserManager from './pages/admin/UserManager'
import Chatbot from './components/Chatbot'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={<Home />} />
        <Route path="/forgot-password" element={<Home />} />
        <Route path="/reset-password" element={<Home />} />
        
        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/course/:courseId/:lessonId" 
          element={
            <ProtectedRoute>
              <Course />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/:category/:id" 
          element={
            <ProtectedRoute>
              <Curriculum />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* Administrative Routes */}
        {/* Admin Routes */}
        <Route 
          path="/admin" 
          element={
            <RoleRoute allowedRoles={['admin']}>
              <AdminLayout />
            </RoleRoute>
          }
        >
          <Route index element={<Navigate to="/admin/overview" replace />} />
          <Route path="overview" element={<AdminOverview />} />
          <Route path="courses" element={<CourseManager />} />
          <Route path="users" element={<UserManager />} />
        </Route>

        {/* Instructor Routes */}
        <Route 
          path="/instructor" 
          element={
            <RoleRoute allowedRoles={['instructor']}>
              <AdminLayout />
            </RoleRoute>
          }
        >
          <Route index element={<Navigate to="/instructor/overview" replace />} />
          <Route path="overview" element={<AdminOverview />} />
          <Route path="courses" element={<CourseManager />} />
        </Route>
      </Routes>
      <Chatbot />
    </Router>
  )
}

export default App
