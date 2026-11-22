import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Loader from '../components/Loader';
import api from '../utils/api';
import { getUserInfo, setUserInfo } from '../components/localStorage';
import './LoginScreen.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

library.add(faEye, faEyeSlash);

const PAGE_TITLE = 'Register Your Wedding Business Free | List as a Vendor on WedMangal';
const PAGE_DESC  = 'Wedding photographers, makeup artists, caterers, decorators, halls and more — list your wedding business free on WedMangal, get discovered by couples in Tamil Nadu and receive enquiries on WhatsApp.';
const PAGE_URL   = 'https://www.wedmangal.com/owner-register';

const BENEFITS = [
  ['🏪', 'Showcase your wedding business with photos, services and prices'],
  ['💑', 'Couples planning their wedding discover you by category and city'],
  ['📩', 'Receive booking enquiries directly — WedMangal does not charge a booking fee'],
  ['✅', 'Free to list. Your profile goes live after a quick review'],
];

function OwnerRegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const redirect = new URLSearchParams(location.search).get('redirect') || '/';

  // Already logged in? Vendors go straight to their dashboard; anyone else is told
  // why they can't register here instead of being bounced away silently.
  const current = getUserInfo();
  const loggedInAs = current && current.token && !success ? current : null;

  const submitHandler = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      await api.post('/api/users/owner-register/', {
        name,
        email,
        password,
        role: 'service-owner',
      });
    } catch (error) {
      setMessage(
        error.response?.data?.detail || error.message || 'Registration failed. Please try again.'
      );
      setLoading(false);
      return;
    }

    // owner-register does not return a login token, so log in with the same
    // credentials (the regular email login) — otherwise the first dashboard call
    // fails and the new vendor is thrown back to the login page.
    try {
      const { data } = await api.post('/api/users/login/', { username: email, password });
      setUserInfo(data);
      setSuccess(true);
      setLoading(false);
      setTimeout(() => navigate(redirect), 1200);
    } catch {
      setLoading(false);
      setSuccess(true);
      setMessage('Your business account is created. Please log in with your email and password to continue.');
      setTimeout(() => navigate('/login?as=vendor'), 2500);
    }
  };

  const logoutAndStay = () => {
    localStorage.removeItem('userInfo');
    window.location.reload();
  };

  return (
    <div className="ls-page">
      <Helmet>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESC} />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={PAGE_URL} />
        <meta property="og:title" content={PAGE_TITLE} />
        <meta property="og:description" content={PAGE_DESC} />
        <meta name="twitter:title" content={PAGE_TITLE} />
        <meta name="twitter:description" content={PAGE_DESC} />
      </Helmet>

      {/* Side panel — how it works (desktop) */}
      <div className="ls-side">
        <div className="ls-side-inner">
          <p className="ls-side-eyebrow">✦ For wedding businesses ✦</p>
          <h2 className="ls-side-title">Get discovered by couples planning their wedding</h2>
          <ol className="ls-steps">
            <li><strong>Create your vendor account</strong>Name, email and a password — takes a minute.</li>
            <li><strong>Add your business details</strong>Category, city, photos, services and prices.</li>
            <li><strong>Go live &amp; get enquiries</strong>After a quick review, couples can find and contact you.</li>
          </ol>
          <div className="ls-side-ornament">❧</div>
          <p className="ls-side-brand">WedMangal</p>
        </div>
        <div className="ls-side-orb ls-side-orb--1" />
        <div className="ls-side-orb ls-side-orb--2" />
      </div>

      {/* Form panel */}
      <div className="ls-form-panel">
        <div className="ls-card">
          <div className="ls-card-header">
            <p className="ls-eyebrow">For vendors · Free listing</p>
            <h1 className="ls-title">Register Your Wedding Business</h1>
            <div className="ls-header-rule">
              <span /><span className="ls-diamond">◆</span><span />
            </div>
          </div>

          {loggedInAs ? (
            loggedInAs.role === 'service-owner' ? (
              <div className="ls-vendor-box">
                <p>You're already logged in to your business account as <strong>{loggedInAs.name || loggedInAs.email}</strong>.</p>
                <Link to="/" className="ls-vendor-cta">Go to my business dashboard →</Link>
              </div>
            ) : (
              <div className="ls-vendor-box">
                <p>
                  You're logged in as <strong>{loggedInAs.name || loggedInAs.email || loggedInAs.username}</strong>,
                  which is a <strong>customer</strong> account (for couples booking vendors).
                </p>
                <p>To list your business, log out and create a separate vendor account below.</p>
                <p>Is your business already listed on WedMangal? Open your listing and tap <strong>“Claim this listing”</strong> instead — you can stay logged in.</p>
                <button type="button" className="ls-submit-btn" onClick={logoutAndStay}>
                  <span>Log out &amp; register my business</span>
                  <span className="ls-btn-arrow">→</span>
                </button>
              </div>
            )
          ) : (
            <>
              <ul className="ls-benefits">
                {BENEFITS.map(([icon, text]) => (
                  <li key={text}><span aria-hidden="true">{icon}</span><span>{text}</span></li>
                ))}
              </ul>

              {message && <div className="ls-error">{message}</div>}
              {loading && <Loader />}
              {success && !message && (
                <div className="ls-vendor-box">
                  <p><strong>Your business account is ready!</strong> Next, add your business details…</p>
                </div>
              )}

              <form onSubmit={submitHandler} className="ls-form">
                <div className="ls-field">
                  <label className="ls-label" htmlFor="or-name">Your name</label>
                  <input
                    id="or-name"
                    className="ls-input"
                    type="text"
                    placeholder="e.g. Priya Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                  <p className="ls-field-hint">You'll add your business name, category and photos in the next step.</p>
                </div>

                <div className="ls-field">
                  <label className="ls-label" htmlFor="or-email">Email address</label>
                  <input
                    id="or-email"
                    className="ls-input"
                    type="email"
                    placeholder="you@yourbusiness.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                  <p className="ls-field-hint">You'll use this email and password to log in to your business account.</p>
                </div>

                <div className="ls-field">
                  <label className="ls-label" htmlFor="or-password">Create a password</label>
                  <div className="ls-pw-wrap">
                    <input
                      id="or-password"
                      className="ls-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Choose a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="ls-pw-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                    </button>
                  </div>
                </div>

                <div className="ls-field">
                  <label className="ls-label" htmlFor="or-confirm">Confirm password</label>
                  <div className="ls-pw-wrap">
                    <input
                      id="or-confirm"
                      className="ls-input"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Type the password again"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="ls-pw-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                    </button>
                  </div>
                </div>

                <button type="submit" className="ls-submit-btn" disabled={loading || success}>
                  <span>Register my business — free</span>
                  <span className="ls-btn-arrow">→</span>
                </button>
              </form>
            </>
          )}

          <div className="ls-links" style={{ marginTop: '1.2rem' }}>
            <p className="ls-link-row">
              Already registered your business?{' '}
              <Link to={redirect !== '/' ? `/login?as=vendor&redirect=${encodeURIComponent(redirect)}` : '/login?as=vendor'}>
                Vendor log in
              </Link>
            </p>
            <p className="ls-link-row">
              Planning a wedding, not a vendor?{' '}
              <Link to="/register">Create a customer account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OwnerRegisterScreen;
