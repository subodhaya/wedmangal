import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAdminUser } from '../utils/auth';
//PrivateRoute.js
const PrivateRoute = ({ roles, element }) => {
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));

  if (!userInfo) {
    // User is not authenticated
    alert('User not authenticated, redirecting to login.');
    return <Navigate to="/login" replace />;
  }

  // Admin routes also admit Django staff (isAdmin), matching the backend
  const allowed = roles.includes(userInfo.role) || (roles.includes('admin') && isAdminUser(userInfo));
  if (!allowed) {
    // User role not authorized
    alert(`User role "${userInfo.role}" not authorized for this route, redirecting to home.`);
    return <Navigate to="/" replace />;
  }

  // Render the passed component if authorized
  return element;
};

export default PrivateRoute;
