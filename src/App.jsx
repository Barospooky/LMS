import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Course from './pages/Course'
import Curriculum from './pages/Curriculum'
import CustomCursor from './components/CustomCursor'
import ProtectedRoute from './components/ProtectedRoute'
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
          path="/:instrument/:id" 
          element={
            <ProtectedRoute>
              <Curriculum />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  )
}

export default App
