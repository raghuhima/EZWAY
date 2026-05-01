import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Composer from './pages/Composer';
import Accounts from './pages/Accounts';

function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/composer" element={<Composer />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/audience" element={<div className="page-title">Audience (Coming Soon)</div>} />
          <Route path="/settings" element={<div className="page-title">Settings (Coming Soon)</div>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
