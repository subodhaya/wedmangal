import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Row, Col, ListGroup, Image, Button } from 'react-bootstrap';
import Message from '../components/Message';
import axios from 'axios';
import api from '../utils/api';  

function WishlistScreen() {
  const [wishlistItems, setWishlistItems] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (userInfo) {
      const wishlists = JSON.parse(localStorage.getItem('wishlists')) || {};
      const userWishlist = wishlists[userInfo._id] || [];
      setWishlistItems(userWishlist);
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const removeFromWishlistHandler = (id) => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  
    // Filter the item out of the wishlist based on its ID
    const updatedWishlist = wishlistItems.filter((item) => item._id !== id); // Ensure correct ID field
    
    // Immediately update the state and localStorage
    setWishlistItems(updatedWishlist);
  
    // Update the current user's wishlist in localStorage
    const allWishlists = JSON.parse(localStorage.getItem('wishlists')) || {};
    allWishlists[userInfo._id] = updatedWishlist; // Update only the current user's wishlist
    localStorage.setItem('wishlists', JSON.stringify(allWishlists));
  
    // Sync with the backend (sending the updated wishlist)
    syncWishlist(updatedWishlist, userInfo.token);
  };
  
  const syncWishlist = async (updatedWishlist, token) => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      console.log("inside sync")
      await api.post(
        '/api/products/wishlist/',
        {
          items: { [userInfo._id]: updatedWishlist }, // Ensure correct format
        },
        {
          headers: {
            Authorization: `Bearer ${token}`, // Authorization header
          },
        }
      );
      console.log('Wishlist synced successfully');
    } catch (error) {
      console.error('Error syncing wishlist with backend:', error);
    }
  };
  
  // Automatically sync the wishlist with the backend when `wishlistItems` changes
  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const wishlistItems = JSON.parse(localStorage.getItem('wishlists')) || [];
  
    if (userInfo && wishlistItems.length > 0) {
      syncWishlist(wishlistItems[userInfo._id], userInfo.token); // Sync the correct wishlist for the user
    }
  }, [wishlistItems]); // Re-sync whenever `wishlistItems` changes
  
  
   // Triggers every time wishlistItems changes

  const handleDateChange = (date, service) => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const updatedWishlist = wishlistItems.map((x) =>
      x.service === service ? { ...x, weddingDate: date } : x
    );
    setWishlistItems(updatedWishlist);
    
    const allWishlistItems = JSON.parse(localStorage.getItem('wishlists')) || [];
    const updatedAllWishlistItems = allWishlistItems.map((x) =>
      x.service === service && x.userId === userInfo._id ? { ...x, weddingDate: date } : x
    );
    localStorage.setItem('wishlists', JSON.stringify(updatedAllWishlistItems));
  };

  return  (
    <Row className="justify-content-center">
      <Col md={8}>
        <div className="highlight-section " style={{ marginTop: '30px' }}>
          <h1>Wishlist</h1>
        {wishlistItems.length === 0 ? (
          <Message variant='info'>
            Your wishlist is empty <Link to='/'>Go Back</Link>
          </Message>
        ) : (
          <ListGroup variant='flush'>
            {wishlistItems.map((item) => (
              <ListGroup.Item key={item._id}>
                <Row>
                  <Col md={2}>
                    <Image src={`/images/${item.image}`} alt={item.name} fluid rounded />
                  </Col>
                  <Col md={3}>
                    <Link to={`/product/${item._id}`}>{item.name}</Link>
                  </Col>
                  
                  <Col md={2}>
                    <Button
                      type='button'
                      variant='light'
                      onClick={() => removeFromWishlistHandler(item._id)}
                    >
                      <i className='fas fa-trash'></i>
                    </Button>
                  </Col>
                </Row>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
        </div>
      </Col>
    </Row>
  );
}

export default WishlistScreen;
