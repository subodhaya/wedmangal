
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Image, ListGroup, Button, Card, Form, Carousel } from 'react-bootstrap';
import Rating from '../components/Rating';
import Loader from '../components/Loader';
import Message from '../components/Message';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';  
import { useLocation } from 'react-router-dom';



// Utility function to debounce a function call
const debounce = (func, delay) => {
  let debounceTimer;
  return (...args) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func.apply(null, args), delay);
  };
};


function ProductScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [selectedQuantities, setSelectedQuantities] = useState({});
  const [selectedDates, setSelectedDates] = useState({});
  const [bookedDates, setBookedDates] = useState({});
  const [selectedStartTimes, setSelectedStartTimes] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successReview, setSuccessReview] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);
  const [errorReview, setErrorReview] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewData, setReviewData] = useState({});
  const [reviewState, setReviewState] = useState({}); 

  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const location = useLocation();



  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/products/${id}/`);
        if (!res.ok) throw new Error('Product not found');
        const data = await res.json();
        const productWithInitializedReviews = {
          ...data,
          services: data.services.map(service => ({
            ...service,
            reviews: service.reviews || [], 
          })),
        };
        setProduct(productWithInitializedReviews);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProduct();
  }, [id]);
  


useEffect(() => {
  if (product?.services) {
    product.services.forEach((service) => fetchBookedDates(service._id));
  }
}, [product]);


useEffect(() => {
  // Reset selected dates when path changes (e.g., back navigation)
  setSelectedDates({});
  console.log('Resetting selectedDates due to navigation change');
}, [location.pathname]);


  

  const fetchBookedDates = async (serviceId) => {
    try {
      const res = await fetch(`/api/products/bookings/${serviceId}/dates`);
      if (!res.ok) throw new Error('Booked dates not found');
      const { booked_dates } = await res.json();
      const formattedDates = booked_dates.map((date) => new Date(date).toISOString().split('T')[0]);
      setBookedDates((prev) => ({ ...prev, [serviceId]: formattedDates }));
    } catch (err) {
      console.error('Error fetching booked dates:', err);
    }
  };

  // Function to check if a user has booked and the service is delivered
  const hasUserBookedService = async (serviceId) => {
    try {
      const res = await fetch(`/api/orders?user=${userInfo._id}&service=${serviceId}&isDelivered=true`);
      if (!res.ok) throw new Error('Order not found');
      const data = await res.json();
      return data.length > 0;
    } catch (error) {
      console.error('Error checking if the user booked the service:', error);
      return false;
    }
  };

  const addToCartHandler = (serviceId) => {
    if (!userInfo) return navigate('/login');

    const service = product.services.find((s) => s._id === serviceId);
    const cartItem = {
      userId: userInfo._id,
      service: serviceId,
      name: service.name,
      image: service.images[0]?.image || product.image,
      price: service.price,
      qty: selectedQuantities[serviceId] || 1,
      
      bookingDate: selectedDates[serviceId].toLocaleDateString('en-CA'), // YYYY-MM-DD

      startTime: selectedStartTimes[serviceId] || '', 
    };

    const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
    const existItem = cartItems.find((item) => item.service === serviceId && item.userId === userInfo._id);
    const updatedCart = existItem
      ? cartItems.map((x) => (x.service === existItem.service ? cartItem : x))
      : [...cartItems, cartItem];

    localStorage.setItem('cartItems', JSON.stringify(updatedCart));
    navigate('/cart');
  };

  const handleReviewChange = useCallback(
    debounce((serviceId, field, value) => {
      setReviewData((prevState) => ({
        ...prevState,
        [serviceId]: {
          ...prevState[serviceId],
          [field]: value,
        },
      }));
    }, 300),
    []
  ); // Debounce with a 300ms delay

  const submitReviewHandler = async (e, serviceId) => {
    e.preventDefault();
  
    if (!userInfo) {
      return navigate('/login');
    }
  
    // Get rating and comment from reviewData for the specific service
    const { rating, comment } = reviewData[serviceId] || {};
  
    // Log the values to debug
    console.log('Submitting Review:', { rating, comment });
  
    // Ensure rating is provided, but allow an empty comment
    if (!rating) {
      setReviewState((prevState) => ({
        ...prevState,
        [serviceId]: { loading: false, success: false, error: 'Rating is required' },
      }));
      return;
    }
  
    // Initialize loading for the current service
    setReviewState((prevState) => ({
      ...prevState,
      [serviceId]: { loading: true, success: false, error: '' },
    }));
  
    try {
      // Submit the review with a rating and optional comment (trim to avoid accidental spaces)
      const res = await fetch(`/api/products/${serviceId}/reviews/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userInfo.token}`,
        },
        body: JSON.stringify({
          rating: rating,  // Ensure rating is sent
          comment: comment?.trim() || '',  // Submit empty string if comment is empty
        }),
      });
  
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Review submission failed');
      }
  
    const newReviewResponse = await res.json();

    if (!res.ok) {
        throw new Error(newReviewResponse.detail || 'Review submission failed');
    }

    const newReview = newReviewResponse.review; // 
  
      // Update the product's services in state with the new review
      setProduct((prevProduct) => {
        const updatedServices = prevProduct.services.map((service) => {
            if (service._id === serviceId) {
                return {
                    ...service,
                    reviews: [newReview, ...(service.reviews || [])], // Add the new review to the front
                };
            }
            return service;
        });

        return { ...prevProduct, services: updatedServices };
    });

  
      // Log updated product state
      //console.log('Updated Product State:', prevProduct);
  
      // Set success state for the current service
      setReviewState((prevState) => ({
        ...prevState,
        [serviceId]: { loading: false, success: true, error: '' },
      }));
  
      setTimeout(() => {
        setReviewState((prevState) => ({
          ...prevState,
          [serviceId]: { ...prevState[serviceId], success: false },
        }));
      }, 3000);
  
      // Reset the review form fields for this service
      setReviewData((prevData) => ({
        ...prevData,
        [serviceId]: { rating: 0, comment: '' },
      }));
    } catch (err) {
      // Handle error state
      setReviewState((prevState) => ({
        ...prevState,
        [serviceId]: { loading: false, success: false, error: err.message },
      }));
  
      if (err.message === 'Review submission failed') {
        alert('You have already submitted a review for this service.');
      }
    }
  };
  
  
  const [alertMessage, setAlertMessage] = useState("");

  const tileClassName = ({ date, view }, serviceId) => {
    if (view === 'month') {
      const dateString = date.toISOString().split('T')[0];
      return bookedDates[serviceId]?.includes(dateString) ? 'booked-date' : 'available-date';
    }
    return null;
  };
  const handleDirectBooking = async (serviceId) => {
    if (!userInfo) {
      navigate('/login');
      return;
    }
  
    const service = product.services.find((s) => s._id === serviceId);
  
    const bookingItem = {
      userId: userInfo._id, // Ensure consistency with backend expectations
      service: serviceId,
      name: service.name,
      image: service.images[0]?.image || product.image,
      price: service.price,
      qty: selectedQuantities[serviceId] || 1,
      
      bookingDate: selectedDates[serviceId].toLocaleDateString('en-CA'), // YYYY-MM-DD

      startTime: selectedStartTimes[serviceId] || '', 
    };
  
    try {
      const { data } = await api.post('/api/products/cart/', {
        items: [bookingItem], // Ensure items array contains userId inside each object
      }, {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      });
      localStorage.setItem('directBookingItem', JSON.stringify(bookingItem));
      navigate('/location');

      navigate('/location');
    } catch (error) {
      console.error('Direct Booking Error:', error);
      setErrorMessage('Error occurred while booking. Please try again.');
    }
  };
  
    
 const handleQtyChange = (serviceId, qty) => setSelectedQuantities({ ...selectedQuantities, [serviceId]: qty });
 const handleDateChange = (serviceId, date) => {
  const isBookedDate = bookedDates[serviceId]?.some(
    (bookedDate) => new Date(bookedDate).toDateString() === date.toDateString()
  );

  if (isBookedDate) {
    alert("This date is not available for booking.");
    return; // Exit the function without updating the selected date
  }

  // If date is available, proceed with setting the selected date
  setSelectedDates((prevDates) => ({
    ...prevDates,
    [serviceId]: date,
  }));
};


  return (
    <div>
      <Link to="/" className="btn btn-outline-primary my-3">
    <i className="fas fa-arrow-left"></i> Go Back
</Link>

{loading ? (
    <Loader />
) : error ? (
    <Message variant="danger">{error}</Message>
) : product ? (
        <>
        <Row className="justify-content-center g-4">
    <Card className="shadow-lg border-0 rounded p-4">
    <Card.Title className="text-primary text-center fw-bold fs-4 slide-title">
    {product.name}
</Card.Title>

        <Row className="align-items-center">
            {/* Left: Product Image */}
            <Col md={6} className="d-flex justify-content-center">
                <Image 
                    src={product.image} 
                    alt={product.name} 
                    fluid 
                    className="rounded shadow-sm"
                    
                />
            </Col>

            {/* Right: Product Details */}
            <Col md={6}>
                <Card.Body>
                    
                    <hr className="mb-3" />
                    <ListGroup variant="flush">
                        <ListGroup.Item className="border-0">
                            <strong>📍 Area:</strong> {product.area_name}
                        </ListGroup.Item>

                        <ListGroup.Item className="border-0">
                            <strong>🏠 Address:</strong> {product.address}
                        </ListGroup.Item>

                        <ListGroup.Item className="border-0">
                            <strong>⏰ Opening Time:</strong> {product.opening_time}
                        </ListGroup.Item>

                        <ListGroup.Item className="border-0">
                            <strong>⏳ Closing Time:</strong> {product.closing_time}
                        </ListGroup.Item>

                        <ListGroup.Item className="border-0">
                            <strong>📞 Business Phone:</strong> {product.business_phone || 'N/A'}
                        </ListGroup.Item>

                        <ListGroup.Item className="border-0">
                            <strong>📱 Personal Phone:</strong> {product.personal_phone || 'N/A'}
                        </ListGroup.Item>
                    </ListGroup>
                </Card.Body>
            </Col>
        </Row>
    </Card>
</Row>


          <h5 className="mt-4">Services</h5>
          <Row>
            {product.services?.map((service) => (
              <Col key={service._id} md={6}>
                <Card>
                  <Card.Body>
                    <h6>{service.name}</h6>
                    <Carousel interval={null}>
  {service.images?.length > 0 ? (
    service.images.map((img) => (
      <Carousel.Item key={img._id}>
        <div className= 'bg-custom'>
        <img
          className="d-block w-100"
          src={img.image}
          alt={service.name}
          style={{ maxWidth: "500px", maxHeight: "300px", objectFit: "contain" }}
        /></div>
      </Carousel.Item>
    ))
  ) : (
    <p>No images available.</p>
  )}
</Carousel>

                    <p>{service.description || 'No description available.'}</p>
                    <Rating value={service.rating} text={`${service.numReviews} reviews`} />
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
    <Col>Date:</Col>
    {/* Legend box for date colors */}
    <div className="my-2">
      <Card className="p-1 legend-card">
        <Card.Body className="py-1 px-2">
          <Row>
            <Col className="d-flex align-items-center">
              <span className="booked-date p-1 me-2"></span>
              <small>Not available</small>
            </Col>
            <Col className="d-flex align-items-center">
              <span className="booking-date p-1 me-2"></span>
              <small>Booking Date</small>
            </Col>
          
          </Row>
        </Card.Body>
      </Card>
    </div>
    <Col>
      <Calendar
        onChange={(date) => handleDateChange(service._id, date)}
        value={selectedDates[service._id] || new Date()}
        minDate={new Date()}
        tileClassName={(props) => tileClassName(props, service._id)}
        tileDisabled={({ date }) => {
          const today = new Date();
          // Disable date if it's a booked date or if it's in the past
          return (
            bookedDates[service._id]?.some(
              (bookedDate) => new Date(bookedDate).toDateString() === date.toDateString()
            ) || date < today
          );
        }}
      />
    </Col>
    <Col >
    <Form.Group controlId={`startTime-${service._id}`} className="mt-2">
  <Form.Label>Appointment:</Form.Label>
  <Form.Control
    type="time"
    value={selectedStartTimes[service._id] || ''}
    onChange={(e) =>
      setSelectedStartTimes((prev) => ({
        ...prev,
        [service._id]: e.target.value,
      }))
    }
    style={{ maxWidth: '120px' }} // 👈 small width
  />
</Form.Group>

  </Col>
  </Row>
</ListGroup.Item>
<ListGroup.Item>
  <Button
    onClick={() => addToCartHandler(service._id)}
    disabled={!selectedDates[service._id] || !selectedStartTimes[service._id]} // Disable if no date or time is selected
    type="button"
  >
    Add to Cart
  </Button>
</ListGroup.Item>

<ListGroup.Item>
  <Button
    onClick={() => handleDirectBooking(service._id)}
    disabled={!selectedDates[service._id] || !selectedStartTimes[service._id]} // Disable if no date or time is selected
    type="button"
  >
    Book Now
  </Button>
</ListGroup.Item>
                    </ListGroup>

                    <h4 className="mt-4">Reviews</h4>
                    {service.reviews && Array.isArray(service.reviews) && service.reviews.length === 0 ? (
                      <Message variant="info">No Reviews</Message>
                    ) : (
                      <ListGroup variant="flush">
                        {(service.reviews || []).map((review) => (
                          <ListGroup.Item key={review._id} className="my-3">
                            <div className="d-flex justify-content-between align-items-center">
                              <h5 className="mb-1" style={{ fontWeight: 'bold' }}>{review.user}</h5>
                              <Rating value={review.rating} color="#f8e825" />
                            </div>
                            <small className="text-muted">
                              {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'N/A'}
                            </small>
                            <p className="mt-2" style={{ fontStyle: review.comment ? 'normal' : 'italic' }}>
                              {review.comment || 'No comment provided.'}
                            </p>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    )}

                    <ListGroup.Item>
                      <h5>Write a Review for {service.name}</h5>
                      
                      {userInfo ? (
                        <Form onSubmit={(e) => submitReviewHandler(e, service._id)}>
                         
                        <Form.Group controlId="rating">
                          <Form.Label>Rating</Form.Label>
                          <Form.Control
                            as="select"
                              value={reviewData[service._id]?.rating || 0}
                              onChange={(e) => handleReviewChange(service._id, 'rating', e.target.value)}
                          >
                            <option value="">Select...</option>
                            <option value="1">1 - Poor</option>
                            <option value="2">2 - Fair</option>
                            <option value="3">3 - Good</option>
                            <option value="4">4 - Very Good</option>
                            <option value="5">5 - Excellent</option>
                          </Form.Control>
                        </Form.Group>
                  
                        <Form.Group controlId="comment">
                          <Form.Label>Comment</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows="3"
                            value={reviewData[service._id]?.comment || ''}
                            onChange={(e) =>
                              setReviewData((prevState) => ({
                                ...prevState,
                                [service._id]: {
                                  ...prevState[service._id],
                                  comment: e.target.value, // Immediate update for the comment
                                },
                              }))
                            }
                          ></Form.Control>
                        </Form.Group>
                          {reviewState[service._id]?.success && <Message variant="success">Review Submitted</Message>}
          {reviewState[service._id]?.loading && <Loader />}
          {reviewState[service._id]?.error && (
            <Message variant="danger">{reviewState[service._id]?.error}</Message>
          )}
                        <Button type="submit" variant="primary">
                          Submit
                        </Button>
                      </Form>
                      ) : (
                        <Message>
                          Please <Link to="/login">sign in</Link> to write a review{' '}
                        </Message>
                      )}
                    </ListGroup.Item>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </>
      ) : (
        <Message variant="danger">Product not found</Message>
      )}
    </div>
  );
}

export default ProductScreen;