import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Users, Settings, Smartphone } from 'lucide-react';

const Sidebar = () => {
  return (
    <div className="sidebar">
      <div className="logo">
        <MessageSquare size={28} />
        WA Sender Pro
      </div>
      
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          Dashboard
        </NavLink>
        <NavLink to="/composer" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <MessageSquare size={20} />
          Composer
        </NavLink>
        <NavLink to="/accounts" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Smartphone size={20} />
          Accounts
        </NavLink>
        <NavLink to="/audience" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Users size={20} />
          Audience
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Settings size={20} />
          Settings
        </NavLink>
      </nav>
    </div>
  );
};

export default Sidebar;
