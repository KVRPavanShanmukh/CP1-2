import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Simulation from './pages/Simulation';

function AppContent() {
  return (
    <>
      <Routes>
        <Route path="*" element={<Simulation />} />
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
