import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { BarChart, CartesianGrid, XAxis, YAxis, Bar } from 'recharts';
import { ResponsiveContainer } from 'recharts';
import Sidebar from './Sidebar';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('');
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('http://localhost:5000/users');
        if (!response.ok) throw new Error('Failed to fetch users');
        const result = await response.json();
        setUsers(result.users);
      } catch (error) {
        console.error(error);
      }
    };
    fetchUsers();
  }, []);

  // Fetch listings
  useEffect(() => {
    if (activeTab === 'View All Listings' || activeTab === 'Approve/Reject Listings') {
      const fetchListings = async () => {
        try {
          const response = await fetch('http://localhost:5000/listings');
          if (!response.ok) throw new Error('Failed to fetch listings');
          const result = await response.json();

          const processedListings = result.listings.map(listing => {
            if (!listing.created_at) {
              return { ...listing, postedYear: 'Unknown', postedMonth: 'Unknown', postedDate: 'Unknown' };
            }

            const createdAt = new Date(listing.created_at);
            return {
              ...listing,
              postedYear: createdAt.getUTCFullYear(),
              postedMonth: createdAt.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' }),
              postedDate: createdAt.getUTCDate(),
            };
          });

          setListings(processedListings);
        } catch (error) {
          console.error('Error fetching listings:', error);
        }
      };

      fetchListings();
    }
  }, [activeTab]);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch('http://localhost:5000/notifications');
        if (!response.ok) throw new Error('Failed to fetch notifications');
        const result = await response.json();
        setNotifications(result.notifications);
      } catch (error) {
        console.error(error);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  // Clear notifications
  const clearNotifications = async () => {
    try {
      const response = await fetch('http://localhost:5000/notifications', {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to clear notifications');
      setNotifications([]); // Clear notifications in the frontend state
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  // Add user notifications
  useEffect(() => {
    if (users.length > 0) {
      const newUser = users[users.length - 1];
      setNotifications(prev => [...prev, `${newUser.fullName} is added`]);
    }
  }, [users]);

  // Add listing notifications
  useEffect(() => {
    if (listings.length > 0) {
      const newListing = listings[listings.length - 1];
      setNotifications(prev => [...prev, `Listing '${newListing.title}' is added`]);
    }
  }, [listings]);

  const toggleUserSuspend = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const response = await fetch(`http://localhost:5000/users/${userId}/suspend`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error('Failed to update user status');
      setUsers(users.map(user => user._id === userId ? { ...user, status: newStatus } : user));
    } catch (error) {
      console.error(error);
    }
  };

  const handleListingAction = async (listingId, action) => {
    let url = `http://localhost:5000/listings/${listingId}`;
    let method = 'PUT';

    if (action === 'rejected') {
      url = `http://localhost:5000/listings/${listingId}/reject`;
      method = 'DELETE'; // Use DELETE method for rejection
    }

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: action !== 'rejected' ? JSON.stringify({ status: action }) : null,
      });

      if (!response.ok) throw new Error('Failed to update listing');

      setListings(listings.filter(listing => listing._id !== listingId)); // Remove from UI if deleted
    } catch (error) {
      console.error(error);
    }
  };

  const activeUsers = users.filter(user => user.status === 'active').length;
  const suspendedUsers = users.length - activeUsers;

  const data = [
    { name: 'Active Users', value: activeUsers },
    { name: 'Suspended Users', value: suspendedUsers },
  ];

  const COLORS = ['#0088FE', '#FFBB28'];

  const processListingsByPrice = (data) => {
    const priceRanges = [100000, 500000, 1000000, 5000000, 10000000]; // 1L, 5L, 10L, 50L, 1Cr
    let processedData = priceRanges.map((price, index) => ({
      price: `${priceRanges[index] / 100000}L - ${(priceRanges[index + 1] ? priceRanges[index + 1] / 100000 : '1Cr+')}`,
      listings: 0,
    }));

    data.forEach(listing => {
      for (let i = 0; i < priceRanges.length; i++) {
        if (listing.price >= priceRanges[i] && (i === priceRanges.length - 1 || listing.price < priceRanges[i + 1])) {
          processedData[i].listings++;
          break;
        }
      }
    });
    return processedData;
  };

  const processListingsByMonth = (data) => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(0, i).toLocaleString('default', { month: 'short' }),
      listings: 0,
    }));

    data.forEach(listing => {
      if (listing.postedMonth !== 'Unknown') {
        const monthIndex = new Date(`${listing.postedMonth} 1, ${listing.postedYear}`).getMonth();
        months[monthIndex].listings += 1;
      }
    });

    return months;
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
                      <button onClick={() => toggleUserSuspend(user._id, user.status)}>
                        {user.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(activeTab === 'View All Listings' || activeTab === 'Approve/Reject Listings') && (
          <div className="listings-table">
            <h2>{activeTab}</h2>
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Price</th>
                  <th>Type</th>
                  <th>Availability</th>
                  <th>listing Posted</th>
                  {activeTab === 'Approve/Reject Listings' && <th>Action</th>}
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
                    <td>{listing.postedMonth} {listing.postedYear}</td>
                    {activeTab === 'Approve/Reject Listings' && (
                      <td>
                        <button onClick={() => handleListingAction(listing._id, 'rejected')}>
                          Reject
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'View Platform Analytics' && (
          <div className="analysis-chart">
            <p className="header-title">Visualization of Users and Listings</p>
            <PieChart width={500} height={350}>
              <Pie data={data} cx={200} cy={150} outerRadius={100} fill="#8884d8" dataKey="value" label>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend layout="vertical" align="right" verticalAlign="middle" />
            </PieChart>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={processListingsByMonth(listings)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" label={{ value: "Month", position: "insideBottom", offset: -5 }} />
                <YAxis label={{ value: "Listings", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Bar dataKey="listings" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="notifications-section">
            <h2>Notifications</h2>
            <table>
              {notifications.length === 0 ? (
                <th>No new notifications</th>
              ) : (
                notifications.map((notif, index) => (
                  <tr key={notif._id || index}>{notif.message}</tr>
                ))
              )}
            </table>
            {notifications.length > 0 && (
              <button onClick={clearNotifications}>Clear All</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;