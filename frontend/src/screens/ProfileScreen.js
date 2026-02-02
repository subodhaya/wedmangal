import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Row, Col, Table } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import Loader from '../components/Loader';
import Message from '../components/Message';
import axios from 'axios';
import api from '../utils/api';  

function ProfileScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [errorOrders, setErrorOrders] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));

        if (!userInfo || !userInfo.access) {
            navigate('/login');
        } else {
            const fetchUserDetails = async () => {
                setLoading(true);
                try {
                    const config = {
                        headers: {
                            Authorization: `Bearer ${userInfo.access}`,
                        },
                    };
                    const { data } = await api.get('/api/users/profile/', config);
                    setUser(data);
                    setName(data.name);
                    setEmail(data.email);
                    setLoading(false);
                } catch (error) {
                    const message = error.response && error.response.data.detail
                        ? error.response.data.detail
                        : error.message;
                    setError(`Failed to fetch user details: ${message}`);
                    setLoading(false);
                }
            };

            const fetchMyOrders = async () => {
                setLoadingOrders(true);
                try {
                    const config = {
                        headers: {
                            Authorization: `Bearer ${userInfo.access}`,
                        },
                    };
                    const { data } = await api.get('/api/orders/myorders/', config);
                    setOrders(data);
                    setLoadingOrders(false);
                } catch (error) {
                    const message = error.response && error.response.data.detail
                        ? error.response.data.detail
                        : error.message;
                    setErrorOrders(`Failed to fetch bookings: ${message}`);
                    setLoadingOrders(false);
                }
            };

            fetchUserDetails();
            fetchMyOrders();
        }
    }, [navigate]);

    const submitHandler = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setMessage('Passwords do not match');
        } else {
            setLoading(true);
            try {
                const userInfo = JSON.parse(localStorage.getItem('userInfo'));

                const config = {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${userInfo.access}`,
                    },
                };

                const updateUser = {
                    id: user._id,
                    name,
                    email,
                    username: email,
                    ...(password && { password }),
                };

                const { data } = await api.put(
                    '/api/users/profile/update/',
                    updateUser,
                    config
                );

                const updatedUserInfo = {
                    ...userInfo,
                    name: data.name,
                    email: data.email,
                    username: data.username,
                };
                localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
                setUser(data);
                setLoading(false);
                setMessage('Profile updated successfully');
            } catch (error) {
                const message = error.response && error.response.data.detail
                    ? error.response.data.detail
                    : error.message;
                setError(`Failed to update profile: ${message}`);
                setLoading(false);
            }
        }
    };

    return (
        
        <Row style={{ marginTop: '30px', marginLeft: '10px' }}>
            
            <Col md={3}>
                <h2>User Profile</h2>
                {message && <Message variant={message.includes('successfully') ? 'success' : 'danger'}>{message}</Message>}
                {error && <Message variant='danger'>{error}</Message>}
                {loading && <Loader />}
                <Form onSubmit={submitHandler}>
                    <Form.Group controlId='name'>
                        <Form.Label>Name</Form.Label>
                        <Form.Control
                            required
                            type='text'
                            placeholder='Enter name'
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </Form.Group>

                    <Form.Group controlId='email'>
                        <Form.Label>Email Address</Form.Label>
                        <Form.Control
                            required
                            type='email'
                            placeholder='Enter email'
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </Form.Group>

                    <Form.Group controlId='password'>
                        <Form.Label>Password</Form.Label>
                        <Form.Control
                            type='password'
                            placeholder='Enter password'
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </Form.Group>

                    <Form.Group controlId='passwordConfirm'>
                        <Form.Label>Confirm Password</Form.Label>
                        <Form.Control
                            type='password'
                            placeholder='Confirm password'
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </Form.Group>

                    <Button type='submit' variant='primary'>
                        Update
                    </Button>
                </Form>
            </Col>

            <Col md={9}>
                <h2>My Orders</h2>
                {loadingOrders ? (
                    <Loader />
                ) : errorOrders ? (
                    <Message variant='danger'>{errorOrders}</Message>
                ) : (
                    <Table striped responsive className='table-sm'>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Date</th>
                                <th>Total</th>
                                <th>Paid</th>
                                <th>Completed</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order._id}>
                                    <td>{order._id}</td>
                                    <td>{order.createdAt.substring(0, 10)}</td>
                                    <td>₹{order.totalPrice}</td>
                                    <td>{order.isPaid ? order.paidAt.substring(0, 10) : (
                                        <i className='fas fa-times' style={{ color: 'red' }}></i>
                                    )}</td>
                                    <td>
                                        <LinkContainer to={`/order/${order._id}`}>
                                            <Button className='btn-sm'>Details</Button>
                                        </LinkContainer>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Col>
        </Row>
    );
}

export default ProfileScreen;
