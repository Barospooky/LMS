import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Course from './pages/Course'
import Curriculum from './pages/Curriculum'
import CustomCursor from './components/CustomCursor'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import AdminLayout from './pages/admin/AdminLayout'
import AdminOverview from './pages/admin/AdminOverview'
import CourseManager from './pages/admin/CourseManager'
import UserManager from './pages/admin/UserManager'
import Chatbot from './components/Chatbot'
import './App.css'

function App() {
  return (
    <Router>
      <CustomCursor />
      <Routes>
        <Route path="/" element={<Home />} />
        
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

        {/* Administrative Routes */}
        <Route 
          path="/admin" 
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Navigate to="/admin/overview" replace />} />
          <Route path="overview" element={<AdminOverview />} />
          <Route path="courses" element={<CourseManager />} />
          <Route path="users" element={<UserManager />} />
        </Route>
      </Routes>
      <Chatbot />
    </Router>
  )
}

export default App
