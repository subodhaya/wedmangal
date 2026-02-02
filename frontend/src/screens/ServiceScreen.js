import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Image, ListGroup, Button, Card, Form, Carousel } from 'react-bootstrap';
import Rating from '../components/Rating';
import Loader from '../components/Loader';
import Message from '../components/Message';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

function ServiceScreen() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedQuantities, setSelectedQuantities] = useState({});
  const [selectedDates, setSelectedDates] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookedDates, setBookedDates] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProduct = async () => {
        setLoading(true);
        if (!id) {
            setLoading(false);
            setError('Product ID is not available');
            return;
        }

        try {
            const response = await fetch(`/api/products/services/${id}/`);
            if (!response.ok) {
                throw new Error('Failed to fetch service');
            }
            const data = await response.json();
            console.log("Fetched data:", data); // Log fetched data
            setProduct(data);
            // Log the product state after setting it
            console.log("Product state after set:", data); 
        } catch (error) {
            console.error('Error fetching service:', error);
            setError('Error fetching service');
        } finally {
            setLoading(false); // Ensure loading is set to false in any case
        }
    };

    const fetchBookedDates = async () => {
        try {
            const response = await fetch(`/api/products/bookings/${id}/dates`);
            if (!response.ok) {
                throw new Error('Booked dates not found');
            }
            const data = await response.json();
            setBookedDates(data.booked_dates || []);
        } catch (error) {
            console.error('Error fetching booked dates:', error);
        }
    };

    fetchProduct();
    fetchBookedDates();
}, [id]);


  const addToCartHandler = (serviceId) => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (!userInfo) {
      navigate('/login');
      return;
    }

    const service = product.services.find((s) => s._id === serviceId);
    if (service) {
      const item = {
        userId: userInfo._id,
        service: service._id,
        name: service.name,
        image: service.images[0]?.image || product.image,
        price: service.price,
        countInStock: service.countInStock,
        qty: selectedQuantities[service._id] || 1,
        bookingDate: selectedDates[service._id] || new Date(),
      };

      let cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];

      const existItem = cartItems.find((x) => x.service === item.service && x.userId === userInfo._id);

      if (existItem) {
        cartItems = cartItems.map((x) => (x.service === existItem.service ? item : x));
      } else {
        cartItems.push(item);
      }

      localStorage.setItem('cartItems', JSON.stringify(cartItems));
      navigate('/cart');
    }
  };

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dateString = date.toISOString().split('T')[0];
      if (bookedDates.includes(dateString)) {
        return 'booked-date';
      }
    }
    return null;
  };

  const tileDisabled = ({ date, view }) => {
    if (view === 'month') {
      const dateString = date.toISOString().split('T')[0];
      return bookedDates.includes(dateString);
    }
    return false;
  };

  const handleQtyChange = (serviceId, qty) => {
    setSelectedQuantities({ ...selectedQuantities, [serviceId]: qty });
  };

  const handleDateChange = (serviceId, date) => {
    setSelectedDates({ ...selectedDates, [serviceId]: date });
  };

  return (
    <div>
      <Link to="/" className="btn btn-light my-3">
        Go Back
      </Link>
      {loading ? (
        <Loader />
      ) : error ? (
        <Message variant="danger">{error}</Message>
      ) : product ? (
        <div>
          <Row>
            <Col md={6}>
              <Image src={product.product_related.image} alt={product.product_related.name} fluid className="product-image" />
            </Col>
            <Col md={6}>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <h3>{product.product_related.name}</h3>
                </ListGroup.Item>
                <ListGroup.Item>
    <strong>Area Name:</strong> {product.product_related.area_name}
</ListGroup.Item>

<ListGroup.Item>
    <strong>Full Address:</strong> {product.product_related.address}
</ListGroup.Item>

<ListGroup.Item>
    <strong>Opening Time:</strong> {product.product_related.opening_time}
</ListGroup.Item>

<ListGroup.Item>
    <strong>Closing Time:</strong> {product.product_related.closing_time}
</ListGroup.Item>

                <ListGroup.Item>
                  <strong>Business Phone:</strong> {product.product_related.business_phone || 'N/A'}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Personal Phone:</strong> {product.product_related.personal_phone}
                </ListGroup.Item>
              </ListGroup>
            </Col>
          </Row>

          <h5 className="mt-4">Services</h5>
          {product && product.services && product.services.length > 0 ? (
          <Row>
            {product.services.map((service) => (
              <Col key={service._id} md={6} className="my-4">
                <Card className="service-card">
                  <Card.Body>
                    <h6>{service.name}</h6>
                    <Carousel interval={null}>
                      {service.images.map((image) => (
                        <Carousel.Item key={image._id}>
                          <img
                            className="d-block w-100"
                            src={image.image}
                            alt={`Service ${service.name}`}
                          />
                        </Carousel.Item>
                      ))}
                    </Carousel>
                    <p><strong>Description:</strong> {service.description}</p>
                    <Rating value={service.rating} text={`${service.numReviews} reviews`} color={'#f8e825'} />
                    
                    <ListGroup variant="flush">
                      <ListGroup.Item>
                        <Row>
                          <Col>Price:</Col>
                          <Col>
                            <strong>₹{service.price}</strong>
                          </Col>
                        </Row>
                      </ListGroup.Item>
                      <ListGroup.Item>
                        <Row>
                          <Col>Status:</Col>
                          <Col>{service.countInStock > 0 ? 'Booking open' : 'Booking closed'}</Col>
                        </Row>
                      </ListGroup.Item>
                      {service.countInStock > 0 && (
                        <>
                          <ListGroup.Item>
                            <Row>
                              <Col>Date:</Col>
                              <Col>
                                <Calendar
                                  onChange={(date) => handleDateChange(service._id, date)}
                                  value={selectedDates[service._id] || new Date()}
                                  minDate={new Date()}
                                  tileClassName={tileClassName}
                                  tileDisabled={tileDisabled}
                                />
                              </Col>
                            </Row>
                          </ListGroup.Item>
                          <ListGroup.Item>
                            <Row>
                              <Col>Qty</Col>
                              <Col xs="auto" className="my-1">
                                <Form.Control
                                  as="select"
                                  value={selectedQuantities[service._id] || 1}
                                  onChange={(e) => handleQtyChange(service._id, e.target.value)}
                                >
                                  {[...Array(service.countInStock).keys()].map((x) => (
                                    <option key={x + 1} value={x + 1}>
                                      {x + 1}
                                    </option>
                                  ))}
                                </Form.Control>
                              </Col>
                            </Row>
                          </ListGroup.Item>
                        </>
                      )}
                      <ListGroup.Item>
                      
                      </ListGroup.Item>
                    </ListGroup>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
          ) : (
            <Message variant="info">No services available for this product</Message>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default ServiceScreen;
