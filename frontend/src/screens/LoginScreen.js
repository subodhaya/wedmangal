// src/screens/LoginScreen.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import api from '../utils/api';
import { setUserInfo, getUserInfo } from '../components/localStorage';
import PhoneOtpStep from '../components/PhoneOtpStep';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import '../components/ClaimModal.css';
import './LoginScreen.css';

library.add(faEye, faEyeSlash);

function LoginScreen() {
    const location = useLocation();
    const navigate  = useNavigate();

    const [tab, setTab]                   = useState('phone'); // 'phone' | 'email'
    const [username, setUsername]         = useState('');
    const [password, setPassword]         = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError]               = useState('');
    const [loading, setLoading]           = useState(false);

    const redirect = new URLSearchParams(location.search).get('redirect') || '/';

    useEffect(() => {
        const userInfo = getUserInfo();
        if (userInfo && userInfo.token) navigate(redirect);
    }, [navigate, redirect]);

    const goAfterLogin = (data) => {
        setUserInfo(data);
        if (!data.phone) {
            navigate(`/add-phone?redirect=${encodeURIComponent(redirect)}`);
        } else {
            navigate(redirect);
        }
    };

    const submitHandler = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await api.post('/api/users/login/', { username, password });
            goAfterLogin(data);
        } catch (err) {
            setError(err.response?.data?.detail || err.message);
        }
        setLoading(false);
    };

    return (
        <div className="ls-page">
            {/* Decorative side panel */}
            <div className="ls-side">
                <div className="ls-side-inner">
                    <p className="ls-side-eyebrow">✦ Welcome back ✦</p>
                    <h2 className="ls-side-title">Your dream wedding starts here</h2>
                    <p className="ls-side-sub">
                        Book trusted vendors, manage your checklist, and plan every detail — all in one place.
                    </p>
                    <div className="ls-side-ornament">❧</div>
                    <p className="ls-side-brand">WedMangal</p>
                </div>
                <div className="ls-side-orb ls-side-orb--1" />
                <div className="ls-side-orb ls-side-orb--2" />
            </div>

            {/* Form panel */}
            <div className="ls-form-panel">
                <div className="ls-card">

                    {/* Header */}
                    <div className="ls-card-header">
                        <p className="ls-eyebrow">Welcome back</p>
                        <h1 className="ls-title">Log In</h1>
                        <div className="ls-header-rule">
                            <span /><span className="ls-diamond">◆</span><span />
                        </div>
                    </div>

                    {error   && <div className="ls-error">{error}</div>}
                    {loading && <Loader />}

                    {tab === 'phone' ? (
                        <PhoneOtpStep
                            sendUrl="/api/users/login/send-otp/"
                            verifyUrl="/api/users/login/verify-otp/"
                            onVerified={(data) => { setUserInfo(data); navigate(redirect); }}
                            phoneDesc="Enter your mobile number. We'll send a 6-digit code to log you in — no password needed."
                            verifyButtonLabel="Verify & Log In ✓"
                        />
                    ) : (
                        <form onSubmit={submitHandler} className="ls-form">
                            {/* Email */}
                            <div className="ls-field">
                                <label className="ls-label" htmlFor="ls-email">Email Address</label>
                                <input
                                    id="ls-email"
                                    className="ls-input"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    autoComplete="email"
                                />
                            </div>

                            {/* Password */}
                            <div className="ls-field">
                                <label className="ls-label" htmlFor="ls-password">Password</label>
                                <div className="ls-pw-wrap">
                                    <input
                                        id="ls-password"
                                        className="ls-input"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="current-password"
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

                            <button type="submit" className="ls-submit-btn">
                                <span>Log In</span>
                                <span className="ls-btn-arrow">→</span>
                            </button>
                        </form>
                    )}

                    <p className="ls-tab-switch">
                        {tab === 'phone' ? (
                            <button type="button" className="ls-tab-link" onClick={() => { setTab('email'); setError(''); }}>
                                Log in with email instead
                            </button>
                        ) : (
                            <button type="button" className="ls-tab-link" onClick={() => { setTab('phone'); setError(''); }}>
                                ← Log in with phone number instead
                            </button>
                        )}
                    </p>

                    {/* Footer links */}
                    <div className="ls-links">
                        <p className="ls-link-row">
                            New customer?{' '}
                            <Link to={redirect !== '/' ? `/register?redirect=${redirect}` : '/register'}>
                                Create an account
                            </Link>
                        </p>
                        <p className="ls-link-row">
                            Are you a vendor?{' '}
                            <Link to={redirect !== '/' ? `/owner-register?redirect=${redirect}` : '/owner-register'}>
                                Register as Vendor
                            </Link>
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default LoginScreen;
