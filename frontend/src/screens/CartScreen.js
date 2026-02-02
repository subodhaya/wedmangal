import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Row, Col, ListGroup, Image, Button, Card } from 'react-bootstrap';
import Message from '../components/Message';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import api from '../utils/api';  
import axios from 'axios';

function CartScreen() {
  const [cartItems, setCartItems] = useState([]);
  const [editingDateFor, setEditingDateFor] = useState(null);
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (userInfo) {
      const items = JSON.parse(localStorage.getItem('cartItems')) || [];
      const userCartItems = items.filter(item => item.userId === userInfo._id);
      setCartItems(userCartItems);
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const removeFromCartHandler = (id) => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const updatedCart = cartItems.filter((item) => item.service !== id);
    setCartItems(updatedCart);
  
    const allCartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
    const updatedAllCartItems = allCartItems.filter(item => !(item.service === id && item.userId === userInfo._id));
    localStorage.setItem('cartItems', JSON.stringify(updatedAllCartItems));
  };

  const checkoutHandler = async () => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
  
    if (userInfo) {
      try {
        const { data } = await api.post('/api/products/cart/', {
        items: cartItems,
        user: userInfo._id,
        }, {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
      });
  
        //localStorage.removeItem('cartItems');
        navigate('/location');
    } catch (error) {
        
        setErrorMessage('Error syncing cart with the database.');
        setSuccessMessage('');
      }
    } else {
      navigate('/login');
    }
  };
  
  


  const handleDateChange = (date, service) => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const updatedCart = cartItems.map((x) =>
      x.service === service ? { ...x, bookingDate: date } : x
    );
    setCartItems(updatedCart);
    const allCartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
    const updatedAllCartItems = allCartItems.map((x) =>
      x.service === service && x.userId === userInfo._id ? { ...x, bookingDate: date } : x
    );
    localStorage.setItem('cartItems', JSON.stringify(updatedAllCartItems));
    console.log(cartItems);
    setEditingDateFor(null);
  };

  // Calculate service price
  const servicesPrice = cartItems.reduce((acc, item) => acc + item.qty * item.price, 0).toFixed(2);
  const shippingPrice = 100; // Flat conveyance fee
  const taxPrice = (servicesPrice * 0.1).toFixed(2); // Tax at 10%
  const totalPrice = (parseFloat(servicesPrice) + parseFloat(shippingPrice) + parseFloat(taxPrice)).toFixed(2);
  useEffect(() => {
    if (successMessage || errorMessage) {
        const timer = setTimeout(() => {
            setSuccessMessage('');
            setErrorMessage('');
        }, 4000);

        return () => clearTimeout(timer);
    }
}, [successMessage, errorMessage]);

return (
    <div>
        {successMessage && <div className="alert alert-success">{successMessage}</div>}
        {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}
    <div className="highlight-section" style={{ marginTop: '30px', padding: '20px' }}>
      <h1 className="text-center">Booking Details</h1>
      {cartItems.length === 0 ? (
        <Message variant="info">
          Your cart is empty <Link to="/">Go Back</Link>
        </Message>
      ) : (
        <Row>
          <Col md={8}>
            <ListGroup variant="flush" className="mb-3">
              {cartItems.map((item) => (
                <ListGroup.Item key={item.service}>
                  <Row className="align-items-center">
                    <Col xs={3} md={2}>
                      <Image src={item.image} alt={item.name} fluid rounded />
                    </Col>
                    <Col xs={5} md={4}>
                      <Link to={`/product/service/${item.service}`}>{item.name}</Link>
                    </Col>
                    <Col xs={4} md={2}>₹{item.price}</Col>
                    <Col xs={12} md={3} className="my-2">
                      {editingDateFor === item.service ? (
                        <Calendar
                          onChange={(date) => handleDateChange(date, item.service)}
                          value={new Date(item.bookingDate)}
                          minDate={new Date()}
                        />
                      ) : (
                        <div onClick={() => setEditingDateFor(item.service)}>
                          <strong>Booking Date:</strong>{' '}
                          {item.bookingDate ? new Date(item.bookingDate).toLocaleDateString() : 'No date selected'}
                        </div>
                      )}
                    </Col>
                    <Col xs={2} md={1}>
                      <Button
                        type="button"
                        variant="light"
                        onClick={() => removeFromCartHandler(item.service)}
                      >
                        <i className="fas fa-trash"></i>
                      </Button>
                    </Col>
                  </Row>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Col>

          <Col md={4}>
            <Card>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <h2>Subtotal ({cartItems.reduce((acc, item) => acc + item.qty, 0)}) items</h2>
                  ₹{servicesPrice}
                </ListGroup.Item>
                <ListGroup.Item>
                  <Row>
                    <Col>Conveyance (subject to adjustment based on distance):</Col>

                    <Col>₹{shippingPrice}</Col>
                  </Row>
                </ListGroup.Item>
                <ListGroup.Item>
                  <Row>
                    <Col>Tax:</Col>
                    <Col>₹{taxPrice}</Col>
                  </Row>
                </ListGroup.Item>
                <ListGroup.Item>
                  <Row>
                    <Col>Total:</Col>
                    <Col>₹{totalPrice}</Col>
                  </Row>
                </ListGroup.Item>
                <ListGroup.Item>
                  <Button
                    type="button"
                    className="btn-block"
                    disabled={cartItems.length === 0}
                    onClick={checkoutHandler}
                  >
                    Proceed To Book
                  </Button>
                </ListGroup.Item>
              </ListGroup>
            </Card>
          </Col>
        </Row>
      )}
    </div>
    </div>
  );
}

export default CartScreen;
