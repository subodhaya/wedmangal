import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api from '../utils/api';  
import { Link } from 'react-router-dom';
import { Carousel, Image } from 'react-bootstrap';
import Loader from './Loader';
import Message from './Message';

function ProductCarousel() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const fetchTopProducts = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/api/products/all/top/');
        setProducts(data);
        setLoading(false);
      } catch (error) {
        setError(
          error.response && error.response.data.detail
            ? error.response.data.detail
            : error.message
        );
        setLoading(false);
      }
    };
  
    fetchTopProducts();

    // Listen for window resize to update width
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filteredProducts = products.filter(product => product.image !== '/images/placeholder.png');

  // Determine number of items per slide
  const itemsPerSlide = windowWidth < 768 ? 1 : 4;

  // Split products into chunks of itemsPerSlide
  const slides = [];
  for (let i = 0; i < filteredProducts.length; i += itemsPerSlide) {
    slides.push(filteredProducts.slice(i, i + itemsPerSlide));
  }

  return (
    <div className="carousel-section">
      <div className= 'bg-custom'>
      <h2 className="carousel-title">These are top-rated popular services</h2></div>
      {loading ? (
        <Loader />
      ) : error ? (
        <Message variant='danger'>{error}</Message>
      ) : (
        <Carousel pause='hover' className='bg-custom'>
          
          {slides.map((slide, index) => (
            <Carousel.Item key={index}>
              <div className="carousel-slide">
                {slide.map(product => (
                  <Link key={product._id} to={`/product/${product._id}`} className="carousel-image-wrapper">
                    <Image src={`${product.image}`} alt={product.name} fluid />
                    <Carousel.Caption className='carousel-caption'>
                      <h4>{product.name}</h4>
                    </Carousel.Caption>
                  </Link>
                ))}
              </div>
            </Carousel.Item>
          ))}
        </Carousel>
      )}
    </div>
  );
}

export default ProductCarousel;
