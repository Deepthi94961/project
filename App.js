import React from 'react';
import { Routes, Route } from 'react-router-dom'; // Removed Router
import './App.css';
import AdminDashboard from './AdminDashboard';
import SignUpSignIn from './SignUpSignIn'; // Separated SignUpSignIn for clarity

const App = () => (
  <Routes>
    <Route path="/" element={<SignUpSignIn />} />
    <Route path="/admin" element={<AdminDashboard />} />
  </Routes>
);

export default App;
