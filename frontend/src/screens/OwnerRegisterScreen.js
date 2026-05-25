import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Loader from '../components/Loader';
import Message from '../components/Message';
import FormContainer from '../components/FormContainer';
import api from '../utils/api';
import './LoginScreen.css';

// ✅ FontAwesome (same as your login screen)
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

library.add(faEye, faEyeSlash);

function OwnerRegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ✅ separate toggles (better UX)
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const redirect = location.search ? location.search.split('=')[1] : '/';

  useEffect(() => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      navigate(redirect);
      window.location.reload();
    }
  }, [navigate, redirect]);

  const submitHandler = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { data } = await api.post('/api/users/owner-register/', {
        name,
        email,
        password,
        role: 'service-owner',
      });

      localStorage.setItem('userInfo', JSON.stringify(data));
      setSuccess(true);
      setLoading(false);

      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error) {
      setMessage(
        error.response?.data?.detail || error.message || 'Registration failed. Please try again.'
      );
      setLoading(false);
    }
  };

  return (
    <FormContainer>
      <div className="login-card">
        <h2 className="login-header">Service Provider Sign Up</h2>

        {message && <Message variant="danger">{message}</Message>}
        {loading && <Loader />}
        {success && (
          <Message variant="success">
            You are registered successfully!
          </Message>
        )}

        <form onSubmit={submitHandler} className="ls-form">

          {/* Name */}
          <div className="ls-field">
            <label className="ls-label">Name</label>
            <input
              className="ls-input"
              type="text"
              placeholder="Enter name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Email */}
          <div className="ls-field">
            <label className="ls-label">Email Address</label>
            <input
              className="ls-input"
              type="email"
              placeholder="Enter Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div className="ls-field">
            <label className="ls-label">Password</label>
            <div className="ls-pw-wrap">
              <input
                className="ls-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="ls-pw-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                <FontAwesomeIcon icon={showPassword ? 'eye-slash' : 'eye'} />
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="ls-field">
            <label className="ls-label">Confirm Password</label>
            <div className="ls-pw-wrap">
              <input
                className="ls-input"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="ls-pw-toggle"
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
              >
                <FontAwesomeIcon icon={showConfirmPassword ? 'eye-slash' : 'eye'} />
              </button>
            </div>
          </div>

          <button type="submit" className="ls-submit-btn">
            <span>Register</span>
            <span className="ls-btn-arrow">→</span>
          </button>
        </form>

        <div className="ls-links">
          <p className="ls-link-row">
            Have an Account?{' '}
            <Link to={redirect ? `/login?redirect=${redirect}` : '/login'}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </FormContainer>
  );
}

export default OwnerRegisterScreen;