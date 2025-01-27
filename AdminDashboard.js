import React, { useState, useEffect } from 'react';
import {
  FaHome,
  FaUser,
  FaTasks,
  FaChartBar,
  FaCog,
  FaBell,
  FaList,
  FaBan,
} from 'react-icons/fa';
import './AdminDashboard.css';

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
      {/* Home icon for toggling the menu */}
      <div className="top-section" onClick={() => setIsMenuOpen(!isMenuOpen)}>
        <div className="icon home-icon">
          <FaHome size={30} />
        </div>
        <h2>Admin Panel</h2>
      </div>

      {/* Display menu items only when the menu is open */}
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

const Content = ({ activeTab, users, setUsers }) => {
  return (
    <div className="main-content">
      {activeTab === 'View All Users' && (
        <div className="user-table">
          <h2>{activeTab}</h2>
          <table>
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.email}>
                  <td>{user._id}</td>
                  <td>{user.fullName}</td>
                  <td>{user.email}</td>
                  <td>{user.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('View All Users');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const response = await fetch('http://localhost:5000/users');
      const result = await response.json();
      if (response.ok) {
        setUsers(result.users);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div className="dashboard">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <Content activeTab={activeTab} users={users} setUsers={setUsers} />
    </div>
  );
};

export default AdminDashboard;
