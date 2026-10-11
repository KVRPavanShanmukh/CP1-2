import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import SimulationCursor from './components/SimulationCursor';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Simulation from './pages/Simulation';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';

function AppContent() {
  return (
    <>
      <SimulationCursor />
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/simulation" element={<Simulation />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
