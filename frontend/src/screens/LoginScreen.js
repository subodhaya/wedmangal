// src/screens/LoginScreen.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import api from '../utils/api';
import { setUserInfo, getUserInfo } from '../components/localStorage';
import PhoneOtpStep from '../components/PhoneOtpStep';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import '../components/ClaimModal.css';
import './LoginScreen.css';

library.add(faEye, faEyeSlash);

// Same client ID the backend verifies tokens against (base/views/auth_views.py).
const GOOGLE_CLIENT_ID = '729274233685-h48vkscuohkqt32n8o72ifik06g2cv0d.apps.googleusercontent.com';

function LoginScreen() {
    const location = useLocation();
    const navigate  = useNavigate();

    const params   = new URLSearchParams(location.search);
    // 'couple' | 'vendor' — only changes the copy; the login methods are the same for both.
    const [audience, setAudience]         = useState(params.get('as') === 'vendor' ? 'vendor' : 'couple');
    const isVendor = audience === 'vendor';
    const [username, setUsername]         = useState('');
    const [password, setPassword]         = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError]               = useState('');
    const [loading, setLoading]           = useState(false);

    const redirect = params.get('redirect') || '/';
    const vendorRegisterLink = redirect !== '/' ? `/owner-register?redirect=${encodeURIComponent(redirect)}` : '/owner-register';

    const chooseAudience = (next) => {
        setAudience(next);
        setError('');
    };

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

    // Plain "Continue with Google" button only — no One Tap / auto sign-in, which used to
    // log people in before they could choose phone or email.
    const handleGoogle = async ({ credential }) => {
        setError('');
        setLoading(true);
        try {
            const { data } = await api.post('/api/auth/google-login/', { token: credential });
            goAfterLogin(data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Google login failed. Please try another way.');
        }
        setLoading(false);
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
            {/* Left (desktop): choose who you are — big photo cards */}
            <div className="ls-choose">
                <p className="ls-choose-title">Who are you?</p>
                <p className="ls-choose-sub">Pick one, then log in on the right.</p>

                <button
                    type="button"
                    className={`ls-choose-card ${!isVendor ? 'is-active' : ''}`}
                    aria-pressed={!isVendor}
                    onClick={() => chooseAudience('couple')}
                >
                    <img className="ls-choose-img ls-role-img--couple" src="/images/19.jpg" alt="" width="140" height="140" />
                    <span className="ls-choose-body">
                        <span className="ls-choose-name">💑 I'm planning a wedding</span>
                        <span className="ls-choose-point">✓ Find trusted wedding vendors</span>
                        <span className="ls-choose-point">✓ Compare prices, photos &amp; reviews</span>
                        <span className="ls-choose-point">✓ Book &amp; plan your wedding — free</span>
                    </span>
                    <span className="ls-choose-check" aria-hidden="true">✓</span>
                </button>

                <button
                    type="button"
                    className={`ls-choose-card ${isVendor ? 'is-active' : ''}`}
                    aria-pressed={isVendor}
                    onClick={() => chooseAudience('vendor')}
                >
                    <img className="ls-choose-img" src="/images/makeupartist.jpg" alt="" width="140" height="140" />
                    <span className="ls-choose-body">
                        <span className="ls-choose-name">🏪 I'm a wedding vendor</span>
                        <span className="ls-choose-point">✓ Showcase your business &amp; work</span>
                        <span className="ls-choose-point">✓ Get discovered by couples</span>
                        <span className="ls-choose-point">✓ Receive enquiries — listing is free</span>
                    </span>
                    <span className="ls-choose-check" aria-hidden="true">✓</span>
                </button>
                <p className="ls-choose-foot">
                    New vendor? <Link to={vendorRegisterLink}>Register your business free →</Link>
                </p>
            </div>

            {/* Form panel */}
            <div className="ls-form-panel">
                <div className="ls-card">

                    <h1 className="ls-title ls-title--compact">{isVendor ? 'Vendor Log In' : 'Log In'}</h1>

                    {/* Who are you? — compact picture cards */}
                    <div className="ls-role-switch ls-role-switch--mobile" role="group" aria-label="Who are you?">
                        <button
                            type="button"
                            className={`ls-role-btn ${!isVendor ? 'is-active' : ''}`}
                            aria-pressed={!isVendor}
                            onClick={() => chooseAudience('couple')}
                        >
                            <img className="ls-role-img ls-role-img--couple" src="/images/19.jpg" alt="" width="52" height="52" />
                            <span className="ls-role-text">
                                <span className="ls-role-name">Planning a wedding</span>
                                <small>Couples &amp; families</small>
                            </span>
                        </button>
                        <button
                            type="button"
                            className={`ls-role-btn ${isVendor ? 'is-active' : ''}`}
                            aria-pressed={isVendor}
                            onClick={() => chooseAudience('vendor')}
                        >
                            <img className="ls-role-img" src="/images/makeupartist.jpg" alt="" width="52" height="52" />
                            <span className="ls-role-text">
                                <span className="ls-role-name">Wedding vendor</span>
                                <small>Business owners</small>
                            </span>
                        </button>
                    </div>

                    {isVendor && (
                        <div className="ls-vendor-box">
                            <p>
                                <strong>New vendor?</strong>{' '}
                                <Link to={vendorRegisterLink}>Register your business free →</Link>
                            </p>
                            <p>
                                ⚠️ A phone number that isn't registered yet creates a <strong>customer</strong> account.
                                Use the email you registered your business with.
                            </p>
                        </div>
                    )}

                    {error   && <div className="ls-error">{error}</div>}
                    {loading && <Loader />}

                    {/* All three ways to log in, shown together: email · Google · phone */}
                    <form onSubmit={submitHandler} className="ls-form ls-form--compact">
                        <label className="ls-sr-only" htmlFor="ls-email">Email address</label>
                        <input
                            id="ls-email"
                            className="ls-input"
                            type="email"
                            placeholder="✉️  Email address"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            autoComplete="email"
                        />
                        <label className="ls-sr-only" htmlFor="ls-password">Password</label>
                        <div className="ls-pw-wrap">
                            <input
                                id="ls-password"
                                className="ls-input"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="🔒  Password"
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
                        <button type="submit" className="ls-submit-btn">
                            <span>Log In with Email</span>
                            <span className="ls-btn-arrow">→</span>
                        </button>
                    </form>

                    <div className="ls-divider ls-divider--compact" aria-hidden="true">
                        <span /><span className="ls-divider-text">or</span><span />
                    </div>
                    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                        <div className="ls-google-wrap ls-google-wrap--compact">
                            <GoogleLogin
                                onSuccess={handleGoogle}
                                onError={() => setError('Google login failed. Please try another way.')}
                                text="continue_with"
                                width="300"
                                useOneTap={false}
                                auto_select={false}
                            />
                        </div>
                    </GoogleOAuthProvider>

                    <div className="ls-divider ls-divider--compact" aria-hidden="true">
                        <span /><span className="ls-divider-text">or with mobile number</span><span />
                    </div>
                    <div className="ls-phone-compact">
                        <PhoneOtpStep
                            sendUrl="/api/users/login/send-otp/"
                            verifyUrl="/api/users/login/verify-otp/"
                            onVerified={(data) => { setUserInfo(data); navigate(redirect); }}
                            verifyButtonLabel="Verify & Log In ✓"
                        />
                    </div>

                    {/* Footer links — one short row */}
                    <p className="ls-foot-row">
                        {isVendor ? (
                            <>New vendor? <Link to={vendorRegisterLink}>Register your business free</Link></>
                        ) : (
                            <>
                                New here?{' '}
                                <Link to={redirect !== '/' ? `/register?redirect=${redirect}` : '/register'}>Create an account</Link>
                                <span className="ls-foot-sep">·</span>
                                Vendor? <Link to={vendorRegisterLink}>List your business free</Link>
                            </>
                        )}
                    </p>

                </div>
            </div>
        </div>
    );
}

export default LoginScreen;
