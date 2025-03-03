import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('');
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);

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

  useEffect(() => {
    if (activeTab === 'View All Listings') {
      const fetchListings = async () => {
        const response = await fetch('http://localhost:5000/listings');
        const result = await response.json();
        if (response.ok) {
          setListings(result.listings);
        }
      };
      fetchListings();
    }
  }, [activeTab]);

  const handleSuspend = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const response = await fetch(`http://localhost:5000/users/${userId}/suspend`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    if (response.ok) {
      setUsers(users.map(user => user._id === userId ? { ...user, status: newStatus } : user));
    }
  };

  return (
    <div className="dashboard">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-content">
        {activeTab === '' && <h2>Welcome to Admin Dashboard</h2>}

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
                  <tr key={user._id}>
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

        {activeTab === 'Suspend/Activate User Accounts' && (
          <div className="user-table">
            <h2>{activeTab}</h2>
            <table>
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>{user._id}</td>
                    <td>{user.fullName}</td>
                    <td>{user.email}</td>
                    <td>
                      <button onClick={() => handleSuspend(user._id, user.status)}>
                        {user.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'View All Listings' && (
          <div className="listings-table">
            <h2>All Listings</h2>
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Price</th>
                  <th>Type</th>
                  <th>Availability</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => (
                  <tr key={listing._id}>
                    <td>{listing.title}</td>
                    <td>{listing.description}</td>
                    <td>${listing.price.toLocaleString()}</td>
                    <td>{listing.property_type}</td>
                    <td>{listing.availability}</td>
                    <td>{listing.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
