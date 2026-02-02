import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Form, Button, Row, Col } from 'react-bootstrap';
import Loader from '../components/Loader';
import Message from '../components/Message';
import FormContainer from '../components/FormContainer';
import axios from 'axios';
import api from '../utils/api';  
import './LoginScreen.css'; // Import the custom CSS

function OwnerRegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
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
    } else {
      setLoading(true);
      setMessage('');
      setError('');
      try {
        const config = {
          headers: {
            'Content-Type': 'application/json',
          },
        };
    
        const { data } = await api.post(
          '/api/users/owner-register/',
          { name, email, password, role: 'service-owner' }, // Assign role here
          config
        );

        localStorage.setItem('userInfo', JSON.stringify(data));
        setSuccess(true);  // Set success message
        setLoading(false);
        setTimeout(() => {
          navigate('/login');
        }, 2000); // Redirect after 2 seconds
      } catch (error) {
        setMessage('Username already exists. Try with a different name');
        setError(
          error.response && error.response.data.detail
            ? error.response.data.detail
            : error.message
        );
        setLoading(false);
      }
    }
  };

  return (
    <FormContainer>
      <div className="login-card">
        <h2 className="login-header">Service Provider Sign Up</h2>
        {message && <Message variant='danger'>{message}</Message>}
        {error && <Message variant='danger'>{error}</Message>}
        {loading && <Loader />}
        {success && <Message variant="success">You are registered successfully!</Message>}
        <Form onSubmit={submitHandler}>
          <Form.Group controlId='name' className="d-flex align-items-center mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control
              required
              type='text'
              placeholder='Enter name'
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Form.Group>

          <Form.Group controlId='email' className="d-flex align-items-center mb-3">
            <Form.Label>Email Address</Form.Label>
            <Form.Control
              required
              type='email'
              placeholder='Enter Email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Form.Group>

          <Form.Group controlId='password' className="d-flex align-items-center mb-3">
            <Form.Label>Password</Form.Label>
            <Form.Control
              required
              type='password'
              placeholder='Enter Password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Form.Group>

          <Form.Group controlId='passwordConfirm' className="d-flex align-items-center mb-3">
            <Form.Label>Confirm Password</Form.Label>
            <Form.Control
              required
              type='password'
              placeholder='Confirm Password'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Form.Group>

          <Button type='submit' variant='primary'>
            Register
          </Button>
        </Form>

        <Row className='py-3'>
          <Col>
            Have an Account?{' '}
            <Link to={redirect ? `/login?redirect=${redirect}` : '/login'}>
              Sign In
            </Link>
          </Col>
        </Row>
      </div>
    </FormContainer>
  );
}

export default OwnerRegisterScreen;
