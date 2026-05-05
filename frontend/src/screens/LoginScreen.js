// src/screens/LoginScreen.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import Loader from '../components/Loader';
import Message from '../components/Message';
import api from '../utils/api';
import { setUserInfo, getUserInfo } from '../components/localStorage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import './LoginScreen.css';

library.add(faEye, faEyeSlash);

//const GOOGLE_CLIENT_ID = "280404144707-bmoon3dudmvgv3vuvihft0uem3elk32b.apps.googleusercontent.com";
const GOOGLE_CLIENT_ID = "729274233685-h48vkscuohkqt32n8o72ifik06g2cv0d.apps.googleusercontent.com";

function LoginScreen() {
    const location = useLocation();
    const navigate  = useNavigate();

    const [username, setUsername]         = useState('');
    const [password, setPassword]         = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError]               = useState('');
    const [loading, setLoading]           = useState(false);

    const redirect = location.search ? location.search.split('=')[1] : '/';

    useEffect(() => {
        const userInfo = getUserInfo();
        if (userInfo && userInfo.token) navigate(redirect);
    }, [navigate, redirect]);

    useEffect(() => {
        if (window.google) {
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleResponse,
                auto_select: true,
            });
            window.google.accounts.id.renderButton(
                document.getElementById("google-login-button"),
                { theme: "outline", size: "large" }
            );
            window.google.accounts.id.prompt();
        }
    }, []);

    const handleGoogleResponse = async (response) => {
        setLoading(true);
        try {
            const { data } = await api.post('/api/auth/google-login/', { token: response.credential });
            setUserInfo(data);
            navigate('/');
            window.location.reload();
        } catch {
            setError('Google login failed');
        } finally {
            setLoading(false);
        }
    };

    const submitHandler = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await api.post('/api/users/login/', { username, password });
            setUserInfo(data);
            navigate('/');
            window.location.reload();
        } catch (err) {
            setError(err.response?.data?.detail || err.message);
        }
        setLoading(false);
    };

    const handleGoogleLoginSuccess = async (credentialResponse) => {
        setLoading(true);
        try {
            const { data } = await api.post('/api/auth/google-login/', { token: credentialResponse.credential });
            setUserInfo(data);
            navigate('/');
            window.location.reload();
        } catch {
            setError('Error during Google login');
        }
        setLoading(false);
    };

    const handleGoogleLoginFailure = () => setError('Google login failed');

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

                    <form onSubmit={submitHandler} className="ls-form">
                        {/* Email */}
                        <div className="ls-field">
                            <label className="ls-label" htmlFor="ls-email">Email Address</label>
                            <input
                                id="ls-email"
                                className="ls-input"
                                type="text"
                                placeholder="you@example.com"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                autoComplete="username"
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
                                    <FontAwesomeIcon icon={showPassword ? 'eye-slash' : 'eye'} />
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="ls-submit-btn">
                            <span>Log In</span>
                            <span className="ls-btn-arrow">→</span>
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="ls-divider">
                        <span /><span className="ls-divider-text">or continue with</span><span />
                    </div>

                    {/* Google login */}
                    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                        <div className="ls-google-wrap">
                            <GoogleLogin
                                onSuccess={handleGoogleLoginSuccess}
                                onError={handleGoogleLoginFailure}
                            />
                        </div>
                    </GoogleOAuthProvider>

                    {/* Footer links */}
                    <div className="ls-links">
                        <p className="ls-link-row">
                            New customer?{' '}
                            <Link to={redirect !== '/' ? `/register?redirect=${redirect}` : '/register'}>
                                Create an account
                            </Link>
                        </p>
                        <p className="ls-link-row">
                            Are you a service provider?{' '}
                            <Link to={redirect !== '/' ? `/owner-register?redirect=${redirect}` : '/owner-register'}>
                                Register here
                            </Link>
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default LoginScreen;
