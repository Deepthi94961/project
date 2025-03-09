import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import AdminDashboard from './AdminDashboard';
import SignUpSignIn from './SignUpSignIn';
import ForgotPassword from './ForgotPassword'; // Import the ForgotPassword component
import ResetPassword from './ResetPassword'; // Import the ResetPassword component

const App = () => (
  <Routes>
    {/* Default route for SignUp/SignIn */}
    <Route path="/" element={<SignUpSignIn />} />

    {/* Route for Admin Dashboard */}
    <Route path="/admin" element={<AdminDashboard />} />

    {/* Route for Forgot Password */}
    <Route path="/forgot-password" element={<ForgotPassword />} />

    {/* Route for Reset Password with token as a parameter */}
    <Route path="/reset-password/:token" element={<ResetPassword />} />
  </Routes>
);

export default App;