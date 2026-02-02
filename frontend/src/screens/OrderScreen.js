import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Row, Col, ListGroup, Image, Card, Button } from 'react-bootstrap';
import api from '../utils/api';
import Loader from '../components/Loader';
import Message from '../components/Message';
import { Alert } from 'react-bootstrap';


const OrderScreen = () => {
  const { id: orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState({ orderItems: [] });
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingDeliver, setLoadingDeliver] = useState(false);
  const [error, setError] = useState(null);
  const [userInfo, setUserInfo] = useState(JSON.parse(localStorage.getItem('userInfo')));
  const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
  const [redirecting, setRedirecting] = useState(false);


  useEffect(() => {
    if (!userInfo) {
      navigate('/login');
    }

    const fetchOrderDetails = async () => {
      try {
        const { data } = await api.get(`/api/orders/${orderId}/`, {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        });
        setOrder(data || { orderItems: [] });
        setLoading(false);
        setRedirecting(true);
        setTimeout(() => {
        setSuccessMessage('Booking is successfully completed! Redirecting to homepage...');
        setTimeout(() => {
          navigate('/');
        }, 6000); // Wait 3 seconds before navigating
      }, 8000); // Show order for 3 seconds first

      
        
      } catch (error) {
        console.error('Error fetching order:', error);
        setOrder({ orderItems: [] });
        setLoading(false);
      }
    };



const totalPrice = (order.orderItems || []).reduce(
  (acc, item) => acc + item.qty * item.price,
  0
);




    fetchOrderDetails();
   
  }, [userInfo, navigate, orderId]);

  const deliverHandler = async () => {
    try {
      setLoadingDeliver(true);
      const { data } = await api.put(`/api/orders/${order._id}/deliver/`, {}, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userInfo.token}`,
        },
      });
      setOrder(data);
      setLoadingDeliver(false);
    
     
      
    } catch (error) {
      setLoadingDeliver(false);
      setError('Booking Completion update failed');
    }
  };

  
  return loading ? (
    <Loader />
  ) : error ? (
    <Message variant="danger">{error}</Message>
  ) : (
    
    <div style={{ marginTop: '10px', marginRight: '10px' }}>
      <h1>Order: {order._id}</h1>
      {successMessage && (
  <Alert variant="success" className="mt-3">
    {successMessage}
  </Alert>
)}

      <Row>
        <Col md={8}>
          <ListGroup variant="flush">
            <ListGroup.Item>
              <h2>Event Address</h2>
              <p>
                <strong>Name: </strong> {order.user && order.user.name}
              </p>
              <p>
                <strong>Email: </strong>
                <a href={`mailto:${order.user && order.user.email}`}>
                  {order.user && order.user.email}
                </a>
              </p>
              <p>
                <strong>Event Address: </strong>
                {order.shippingAddress && order.shippingAddress.address},{' '}
                {order.shippingAddress && order.shippingAddress.city}{' '}
                {order.shippingAddress && order.shippingAddress.postalCode},{' '}
                {order.shippingAddress && order.shippingAddress.country}
              </p>
              {order.isDelivered ? (
                <Message variant="success">
                  Booked service is successfully completed on {order.deliveredAt} 
                </Message>
              ) : (
                <Message variant="warning">Booked service not completed</Message>
              )}
            </ListGroup.Item>

            <ListGroup.Item>
              <h2>Bookings</h2>
              {order.orderItems?.length > 0 ? (
                order.orderItems.map((item, index) => (
                  <ListGroup.Item key={index}>
                    <Row>
                      <Col md={1}>
                        <Image src={item.image} alt={item.name} fluid rounded />
                      </Col>
                      <Col><strong>Service:</strong> {item.name}</Col>
                      <Col md={4}>
                        {item.qty} x ₹{item.price} = ₹{(item.qty * item.price).toFixed(2)}
                      </Col>
                    </Row>
                  </ListGroup.Item>
                ))
              ) : (
                <Message variant="info">No bookings found</Message>
              )}
            </ListGroup.Item>
          </ListGroup>
        </Col>

        <Col md={4}>
          <Card>
            <ListGroup variant="flush">
              <ListGroup.Item><h2>Booking Summary:</h2></ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col>Services Price:</Col>
                  <Col>
                    ₹
                    {(order.orderItems || [])
                      .reduce((acc, item) => acc + item.qty * item.price, 0)
                      .toFixed(2)}
                  </Col>
                </Row>
              </ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col>Conveyance:</Col>
                  <Col>₹{order.shippingPrice}</Col>
                </Row>
              </ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col>Tax:</Col>
                  <Col>₹{order.taxPrice}</Col>
                </Row>
              </ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col>Total:</Col>
                  <Col>₹{order.totalPrice}</Col>
                </Row>
              </ListGroup.Item>
            </ListGroup>

            {loadingDeliver && <Loader />}
            {userInfo && userInfo.isAdmin && !order.isDelivered && (
              <ListGroup.Item>
              <Button
                type="button"
                className="btn btn-block"
                onClick={deliverHandler}
              >
                  Mark As Completed
                </Button>
              </ListGroup.Item>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );

  
};

export default OrderScreen;
