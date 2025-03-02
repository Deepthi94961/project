import React, { useState } from 'react';
import { FaHome, FaUser, FaTasks, FaChartBar, FaCog, FaBell, FaList, FaBan } from 'react-icons/fa';
import './sidebar.css';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    { name: 'View All Users', icon: <FaUser /> },
    { name: 'Suspend/Activate User Accounts', icon: <FaBan /> },
    { name: 'View All Listings', icon: <FaList /> },
    { name: 'Approve/Reject Listings', icon: <FaTasks /> },
    { name: 'View Platform Analytics', icon: <FaChartBar /> },
    { name: 'System Settings', icon: <FaCog /> },
    { name: 'Send Notifications', icon: <FaBell /> },
  ];

  return (
    <div className={`sidebar ${isMenuOpen ? 'open' : 'closed'}`}>
      <div className="top-section" onClick={() => setIsMenuOpen(!isMenuOpen)}>
        <div className="icon home-icon">
          <FaHome size={30} />
        </div>
        <h2>Admin Panel</h2>
      </div>
      {isMenuOpen && (
        <ul className="menu">
          {menuItems.map((item, index) => (
            <li
              key={index}
              className={`menu-item ${activeTab === item.name ? 'active' : ''}`}
              onClick={() => setActiveTab(item.name)}
            >
              <div className="icon">{item.icon}</div>
              <div className="text">{item.name}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Sidebar;
