import React, { useState, useEffect } from 'react';
import { Card, ListGroup } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import Rating from './Rating';

function Product({ product }) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (userInfo) {
      const wishlists = JSON.parse(localStorage.getItem('wishlists')) || {};
      const userWishlist = wishlists[userInfo._id] || [];
      if (userWishlist.some(item => item._id === product._id)) {
        setIsWishlisted(true);
      }
    }
  }, [product._id]);

  const handleWishlistToggle = () => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (!userInfo) {
      navigate('/login');
      return;
    }

    let wishlists = JSON.parse(localStorage.getItem('wishlists')) || {};
    let userWishlist = wishlists[userInfo._id] || [];

    if (isWishlisted) {
      userWishlist = userWishlist.filter(item => item._id !== product._id);
    } else {
      userWishlist.push(product);
    }

    wishlists[userInfo._id] = userWishlist;
    localStorage.setItem('wishlists', JSON.stringify(wishlists));
    setIsWishlisted(!isWishlisted);
  };

  const truncateText = (text, length) => {
    return text.length > length ? text.substring(0, length) + '...' : text;
  };

  return (
    <Card className="my-3 p-3 rounded shadow-sm border-0">
      <Link to={`/product/${product._id}`} className="text-decoration-none">
        <Card.Img 
          src={`/images/${product.image}`} 
          className="product-image rounded-top"
          style={{ objectFit: 'cover', height: '200px' }}
        />
      </Link>

      <Card.Body>
        <Link to={`/product/${product._id}`} className="text-decoration-none">
          <Card.Title 
            className="text-center text-primary fw-bold fs-5"
            style={{ transition: 'transform 0.2s', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.target.style.transform = 'scale(1.05)')}
            onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
          >
            {product.name}
          </Card.Title>
        </Link>

        <Card.Text as="div" className="text-center">
          <Rating
            value={product.average_rating}
            text={`${product.total_num_reviews} reviews`}
            color={'#f8e825'}
          />
        </Card.Text>

        <ListGroup variant="flush">
          <ListGroup.Item className="border-0">
            <strong>City:</strong> {product.city}
          </ListGroup.Item>
          <ListGroup.Item className="border-0">
            <strong>Area:</strong> {product.area_name}
          </ListGroup.Item>
        </ListGroup>

        <div className="d-flex justify-content-between align-items-center mt-3">
          <button 
            onClick={handleWishlistToggle} 
            className="btn btn-light border-0 p-2"
            style={{ transition: '0.3s' }}
          >
            <i 
              className={`fa-heart ${isWishlisted ? 'fas text-danger' : 'far'} fa-2x`}
              style={{ transition: '0.3s' }}
              onMouseEnter={(e) => (e.target.style.transform = 'scale(1.2)')}
              onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
            ></i>
          </button>
        </div>
      </Card.Body>
    </Card>
  );
}

export default Product;
