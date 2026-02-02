import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Form, Button, Row, Col } from 'react-bootstrap';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import Loader from '../components/Loader';
import Message from '../components/Message';
import FormContainer from '../components/FormContainer';
import api from '../utils/api';
import { setUserInfo, getUserInfo } from '../components/localStorage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

library.add(faEye, faEyeSlash);

function LoginScreen() {
    const location = useLocation();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const redirect = location.search ? location.search.split('=')[1] : '/';

    // Redirect if already logged in
    useEffect(() => {
        const userInfo = getUserInfo();
        if (userInfo && userInfo.token) {
            navigate(redirect);
        }
    }, [navigate, redirect]);

    useEffect(() => {
        if (window.google) {
            window.google.accounts.id.initialize({
                client_id: "280404144707-bmoon3dudmvgv3vuvihft0uem3elk32b.apps.googleusercontent.com",
                callback: handleGoogleResponse,
                auto_select: true, 
            });

            // Render the Google sign-in button
            window.google.accounts.id.renderButton(
                document.getElementById("google-login-button"),
                {
                    theme: "outline",
                    size: "large",
                }
            );
            window.google.accounts.id.prompt();
        }
    }, []);

    // Google Login Response
    const handleGoogleResponse = async (response) => {
        setLoading(true);
        const token = response.credential; // JWT returned by Google
        try {
            
            const { data } = await api.post('/api/auth/google-login/', { token });
            setUserInfo(data);
            navigate('/');
            window.location.reload();
        } catch (err) {
            setError('Google login failed');
        } finally {
            setLoading(false);
        }
    };

   

    const submitHandler = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data } = await api.post('/api/users/login/', {
                username,
                password,
            });
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
        const token = credentialResponse.credential;

        try {
            const { data } = await api.post('/api/auth/google-login/', { token });
            setUserInfo(data);
            navigate('/');
            window.location.reload();
        } catch (err) {
            setError('Error during Google login');
        }
        setLoading(false);
    };

    const handleGoogleLoginFailure = () => {
        setError('Google login failed');
    };

    return (
        <FormContainer>
            <div className="login-card">
                <h1 className="login-header">Log In</h1>
                {error && <Message variant="danger">{error}</Message>}
                {loading && <Loader />}

                <Form onSubmit={submitHandler}>
                    <Form.Group controlId="username" className="mb-3">
                        <Form.Label>Email</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Enter your email"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            autoComplete="username"
                        />
                    </Form.Group>

                    <Form.Group controlId="password" className="mb-3">
                        <Form.Label>Password</Form.Label>
                        <div className="password-input-wrapper">
                            <Form.Control
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
                            <FontAwesomeIcon
                                icon={showPassword ? 'eye-slash' : 'eye'}
                                onClick={() => setShowPassword(!showPassword)}
                                className="password-toggle-icon"
                            />
                        </div>
                    </Form.Group>

                    <Button type="submit" variant="primary" className="login-button">
                        Log In
                    </Button>
                </Form>
                <Row className="py-3 align-items-center">
                    <Col className="d-flex justify-content-start">
                        <span className="bold-black-text">NEW CUSTOMER? </span>
                        <Link 
                            to={redirect !== '/' ? `/register?redirect=${redirect}` : '/register'}
                            className="bold-black-text"
                        >
                            REGISTER
                        </Link>
                    </Col>
                </Row>

                {/* Google Login Button */}
                <GoogleOAuthProvider clientId="280404144707-bmoon3dudmvgv3vuvihft0uem3elk32b.apps.googleusercontent.com">
                <div className="google-login-button">
                    <GoogleLogin
                        onSuccess={handleGoogleLoginSuccess}
                        onError={handleGoogleLoginFailure}
                    />
                </div>
                </GoogleOAuthProvider>

                <Row className="py-3 justify-content-end">
                    <Col>
                        Are you a service provider?{' '}
                        <Link to={redirect !== '/' ? `/owner-register?redirect=${redirect}` : '/owner-register'}>
                            Register here
                        </Link>
                    </Col>
                </Row>
            </div>
        </FormContainer>
    );
}

export default LoginScreen;
