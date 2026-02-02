import React, { useState, useEffect } from 'react';
import { Button, Row, Col, ListGroup, Image, Card } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';  
import Message from '../components/Message';
import CheckoutSteps from '../components/CheckoutSteps';

function PlaceOrderScreen() {
    const navigate = useNavigate();

    const directBookingItem = JSON.parse(localStorage.getItem('directBookingItem'));
    const cartItems = directBookingItem
        ? [directBookingItem]
        : JSON.parse(localStorage.getItem('cartItems')) || [];

    const shippingAddress = JSON.parse(localStorage.getItem('shippingAddress')) || {};
    const paymentMethod = localStorage.getItem('paymentMethod') || '';

    const [itemsPrice, setItemsPrice] = useState(0);
    const [shippingPrice, setShippingPrice] = useState(0);
    const [taxPrice, setTaxPrice] = useState(0);
    const [totalPrice, setTotalPrice] = useState(0);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!paymentMethod) {
            navigate('/payment');
        }

        const calculatePrices = () => {
            const itemsPrice = parseFloat(
                cartItems.reduce((acc, item) => acc + item.price * item.qty, 0).toFixed(2)
            );
            const shippingPrice = 100;
            const taxPrice = parseFloat((0.082 * itemsPrice).toFixed(2));
            const totalPrice = parseFloat((itemsPrice + shippingPrice + taxPrice).toFixed(2));

            setItemsPrice(itemsPrice);
            setShippingPrice(shippingPrice);
            setTaxPrice(taxPrice);
            setTotalPrice(totalPrice);
        };

        calculatePrices();
    }, [cartItems, paymentMethod, navigate]);

    const removeFromCartHandler = (id) => {
        const updatedCartItems = cartItems.filter((item) => item.service !== id);
        localStorage.setItem('cartItems', JSON.stringify(updatedCartItems));
        window.location.reload();
    };

    const placeOrder = async () => {
        try {
            const orderData = {
                orderItems: cartItems,
                shippingAddress,
                paymentMethod,
                itemsPrice,
                shippingPrice,
                taxPrice,
                totalPrice,
            };

            const { data } = await api.post('/api/orders/add/', orderData, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${JSON.parse(localStorage.getItem('userInfo')).token}`,
                },
            });

            // Clear cart or direct booking based on source
            if (directBookingItem) {
                localStorage.removeItem('directBookingItem');
            } else {
                localStorage.removeItem('cartItems');
            }

            navigate(`/order/${data._id}`);
        } catch (error) {
            console.error('Error placing order:', error.response ? error.response.data : error.message);
            setError('Booking creation failed. Please try again.');
        }
    };

    return (
        <div>
            <CheckoutSteps step1 step2 step3 step4 />
            <Row>
                <Col md={8}>
                    <ListGroup variant="flush">
                        <ListGroup.Item>
                            <h2>Event Address</h2>
                            <p>
                                <strong>Address:</strong>{' '}
                                {shippingAddress.address}, {shippingAddress.city},{' '}
                                {shippingAddress.postalCode}, {shippingAddress.country}
                            </p>
                        </ListGroup.Item>

                        <ListGroup.Item>
                            <h2>Payment Method</h2>
                            <p>
                                <strong>Method:</strong> {paymentMethod}
                            </p>
                        </ListGroup.Item>

                        <ListGroup.Item>
                            <h2>Bookings</h2>
                            {cartItems.length === 0 ? (
                                <Message variant="info">Your cart is empty</Message>
                            ) : (
                                <ListGroup variant="flush">
                                    {cartItems.map((item, index) => (
                                        <ListGroup.Item key={index}>
                                            <Row>
                                                <Col md={2}>
                                                    <Image
                                                        src={item.image}
                                                        alt={item.name}
                                                        fluid
                                                        rounded
                                                    />
                                                </Col>
                                                <Col>
                                                    <Link to={`/product/${item.service}`}>
                                                        {item.name}
                                                    </Link>
                                                </Col>
                                                <Col md={4}>
                                                    {item.qty} x ₹{item.price} = ₹
                                                    {(item.qty * item.price).toFixed(2)}
                                                </Col>
                                                {!directBookingItem && (
                                                    <Col md={1}>
                                                        <Button
                                                            type="button"
                                                            variant="light"
                                                            onClick={() =>
                                                                removeFromCartHandler(item.service)
                                                            }
                                                        >
                                                            <i className="fas fa-trash"></i>
                                                        </Button>
                                                    </Col>
                                                )}
                                            </Row>
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            )}
                        </ListGroup.Item>
                    </ListGroup>
                </Col>

                <Col md={4}>
                    <Card>
                        <ListGroup variant="flush">
                            <ListGroup.Item>
                                <h2>Booking Summary</h2>
                            </ListGroup.Item>
                            <ListGroup.Item>
                                <Row>
                                    <Col>Items:</Col>
                                    <Col>₹{itemsPrice.toFixed(2)}</Col>
                                </Row>
                            </ListGroup.Item>
                            <ListGroup.Item>
                                <Row>
                                    <Col>Shipping:</Col>
                                    <Col>₹{shippingPrice.toFixed(2)}</Col>
                                </Row>
                            </ListGroup.Item>
                            <ListGroup.Item>
                                <Row>
                                    <Col>Tax:</Col>
                                    <Col>₹{taxPrice.toFixed(2)}</Col>
                                </Row>
                            </ListGroup.Item>
                            <ListGroup.Item>
                                <Row>
                                    <Col>Total:</Col>
                                    <Col>₹{totalPrice.toFixed(2)}</Col>
                                </Row>
                            </ListGroup.Item>
                            <ListGroup.Item>
                                {error && <Message variant="danger">{error}</Message>}
                            </ListGroup.Item>
                            <ListGroup.Item>
                                <Button
                                    type="button"
                                    className="btn-block"
                                    disabled={cartItems.length === 0}
                                    onClick={placeOrder}
                                >
                                    Confirm Booking
                                </Button>
                            </ListGroup.Item>
                        </ListGroup>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}

export default PlaceOrderScreen;
