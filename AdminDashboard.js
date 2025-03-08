import React, { Component } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { BarChart, CartesianGrid, XAxis, YAxis, Bar } from 'recharts';
import { ResponsiveContainer } from 'recharts';
import { Save, Settings } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Sidebar from './Sidebar';
import './AdminDashboard.css';

class AdminDashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: '',
      users: [],
      listings: [],
      notifications: [],
      settings: [
        {
          id: '1',
          name: 'maintenanceMode',
          value: 'false',
          description: 'Enable maintenance mode',
        },
        {
          id: '2',
          name: 'userRegistration',
          value: 'true',
          description: 'Allow new user registrations',
        },
        {
          id: '3',
          name: 'listingAutoApproval',
          value: 'false',
          description: 'Auto-approve new listings',
        },
        {
          id: '4',
          name: 'maxFileSize',
          value: '5',
          description: 'Maximum file upload size (MB)',
        },
      ],
    };
  }

  componentDidMount() {
    this.fetchUsers();
    this.fetchNotifications();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.activeTab !== this.state.activeTab) {
      if (
        this.state.activeTab === 'View All Listings' ||
        this.state.activeTab === 'Approve/Reject Listings'
      ) {
        this.fetchListings();
      }
    }
  }

  fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:5000/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const result = await response.json();
      this.setState({ users: result.users });
    } catch (error) {
      console.error(error);
    }
  };

  fetchListings = async () => {
    try {
      const response = await fetch('http://localhost:5000/listings');
      if (!response.ok) throw new Error('Failed to fetch listings');
      const result = await response.json();

      const processedListings = result.listings.map((listing) => {
        if (!listing.created_at) {
          return {
            ...listing,
            postedYear: 'Unknown',
            postedMonth: 'Unknown',
            postedDate: 'Unknown',
          };
        }

        const createdAt = new Date(listing.created_at);
        return {
          ...listing,
          postedYear: createdAt.getUTCFullYear(),
          postedMonth: createdAt.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' }),
          postedDate: createdAt.getUTCDate(),
        };
      });

      this.setState({ listings: processedListings });
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  };

  fetchNotifications = async () => {
    try {
      const response = await fetch('http://localhost:5000/notifications');
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const result = await response.json();
      this.setState({ notifications: result.notifications });
    } catch (error) {
      console.error(error);
    }
  };

  clearNotifications = async () => {
    try {
      const response = await fetch('http://localhost:5000/notifications', {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to clear notifications');
      this.setState({ notifications: [] }); // Clear notifications in the frontend state
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  toggleUserSuspend = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const response = await fetch(`http://localhost:5000/users/${userId}/suspend`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error('Failed to update user status');
      this.setState((prevState) => ({
        users: prevState.users.map((user) =>
          user._id === userId ? { ...user, status: newStatus } : user
        ),
      }));
    } catch (error) {
      console.error(error);
    }
  };

  handleListingAction = async (listingId, action) => {
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

      this.setState((prevState) => ({
        listings: prevState.listings.filter((listing) => listing._id !== listingId),
      }));
    } catch (error) {
      console.error(error);
    }
  };

  handleSettingChange = (id, newValue) => {
    this.setState((prevState) => ({
      settings: prevState.settings.map((setting) =>
        setting.id === id ? { ...setting, value: newValue } : setting
      ),
    }));
  };

  handleSaveSettings = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.state.settings),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      // Display success toast
      toast.success('Settings saved successfully!', {
        position: 'top-right',
        autoClose: 3000, // Close after 3 seconds
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (error) {
      console.error('Error saving settings:', error);

      // Display error toast
      toast.error('Failed to save settings. Please try again.', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  processListingsByPrice = (data) => {
    const priceRanges = [100000, 500000, 1000000, 5000000, 10000000]; // 1L, 5L, 10L, 50L, 1Cr
    let processedData = priceRanges.map((price, index) => ({
      price: `${priceRanges[index] / 100000}L - ${
        priceRanges[index + 1] ? priceRanges[index + 1] / 100000 : '1Cr+'
      }`,
      listings: 0,
    }));

    data.forEach((listing) => {
      for (let i = 0; i < priceRanges.length; i++) {
        if (
          listing.price >= priceRanges[i] &&
          (i === priceRanges.length - 1 || listing.price < priceRanges[i + 1])
        ) {
          processedData[i].listings++;
          break;
        }
      }
    });
    return processedData;
  };

  processListingsByMonth = (data) => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(0, i).toLocaleString('default', { month: 'short' }),
      listings: 0,
    }));

    data.forEach((listing) => {
      if (listing.postedMonth !== 'Unknown') {
        const monthIndex = new Date(`${listing.postedMonth} 1, ${listing.postedYear}`).getMonth();
        months[monthIndex].listings += 1;
      }
    });

    return months;
  };

  handleSignin = async (email, password) => {
    try {
      const response = await fetch('http://localhost:5000/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.status === 503) {
        const data = await response.json();
        toast.error(data.message); // Display maintenance mode message
        return;
      }

      if (!response.ok) throw new Error('Failed to sign in');

      const result = await response.json();
      toast.success(result.message); // Display success message

      // Redirect admin to the admin dashboard
      if (email === 'chdeepthi5678@gmail.com') {
        window.location.href = '/admin-dashboard'; // Redirect to admin dashboard
      }
    } catch (error) {
      console.error('Error during sign-in:', error);
      toast.error('Error signing in. Please try again.');
    }
  };

  handleSignup = async (fullName, email, password, confirmPassword) => {
    if (!fullName || !email || !password || password !== confirmPassword) {
      toast.error('Invalid input or passwords do not match.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password, confirmPassword }),
      });

      if (response.status === 503) {
        const data = await response.json();
        toast.error(data.message); // Display maintenance mode message
        return;
      }

      if (!response.ok) throw new Error('Failed to sign up');

      const result = await response.json();
      toast.success(result.message); // Display success message
    } catch (error) {
      console.error('Error during signup:', error);
      toast.error('Error registering user. Please try again.');
    }
  };

  render() {
    const { activeTab, users, listings, notifications, settings } = this.state;
    const activeUsers = users.filter((user) => user.status === 'active').length;
    const suspendedUsers = users.length - activeUsers;

    const data = [
      { name: 'Active Users', value: activeUsers },
      { name: 'Suspended Users', value: suspendedUsers },
    ];

    const COLORS = ['#0088FE', '#FFBB28'];

    return (
      <div className="dashboard">
        <Sidebar activeTab={activeTab} setActiveTab={(tab) => this.setState({ activeTab: tab })} />
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
                        <button onClick={() => this.toggleUserSuspend(user._id, user.status)}>
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
                          <button onClick={() => this.handleListingAction(listing._id, 'rejected')}>
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
                <BarChart
                  data={this.processListingsByMonth(listings)}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" label={{ value: 'Month', position: 'insideBottom', offset: -5 }} />
                  <YAxis label={{ value: 'Listings', angle: -90, position: 'insideLeft' }} />
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
                <button onClick={this.clearNotifications}>Clear All</button>
              )}
            </div>
          )}

          {activeTab === 'System Settings' && (
            <div className="system-settings">
              <div className="settings-header">
                <Settings className="settings-icon" />
                <h2>System Settings</h2>
              </div>

              <div className="settings-list">
                {settings.map((setting) => (
                  <div key={setting.id} className="setting-item">
                    <label className="setting-label">{setting.description}</label>
                    {setting.name === 'maintenanceMode' ||
                    setting.name === 'userRegistration' ||
                    setting.name === 'listingAutoApproval' ? (
                      <select
                        value={setting.value}
                        onChange={(e) => this.handleSettingChange(setting.id, e.target.value)}
                        className="setting-input"
                      >
                        <option value="true">Enabled</option>
                        <option value="false">Disabled</option>
                      </select>
                    ) : (
                      <input
                        type="number"
                        value={setting.value}
                        onChange={(e) => this.handleSettingChange(setting.id, e.target.value)}
                        className="setting-input"
                      />
                    )}
                  </div>
                ))}
              </div>

              <button onClick={this.handleSaveSettings} className="save-button">
                <Save className="save-icon" />
                Save Settings
              </button>
            </div>
          )}
        </div>

        {/* Add ToastContainer to display notifications */}
        <ToastContainer />
      </div>
    );
  }
}

export default AdminDashboard;