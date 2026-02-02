import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api from '../utils/api';  
import { useLocation } from 'react-router-dom';
import { Row, Col } from 'react-bootstrap';
import Product from '../components/Product';
import Loader from '../components/Loader';
import Message from '../components/Message';
import Paginate from '../components/Paginate';

function SearchResultScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  const city = queryParams.get('city') || '';
  const vendor = queryParams.get('vendor') || '';
  const pageNumber = parseInt(queryParams.get('page'), 10) || 1; // Convert pageNumber to integer

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/api/products/search/', {
          params: {
            city,
            vendor,
            page: pageNumber,
          },
        });

        console.log('API Response Data:', data);

        // Handle response data
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
        } else {
          setProducts([]);
        }

        // If pagination data is returned separately, adjust the logic to set page and pages
        // For example:
        // setPage(data.page || 1);
        // setPages(data.pages || 1);

      } catch (error) {
        setError(
          error.response && error.response.data.message
            ? error.response.data.message
            : error.message
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [city, vendor, pageNumber]);

  const handlePageChange = (newPage) => {
    const queryString = new URLSearchParams({ city, vendor, page: newPage }).toString();
    window.history.pushState(null, '', `/search?${queryString}`);
    setPage(newPage);
  };

  return (
    <div className="container highlight-section">
      <h1>Search Results</h1>
      {loading ? (
        <Loader />
      ) : error ? (
        <Message variant='danger'>{error}</Message>
      ) : (
        <>
          {products.length === 0 ? (
            <Message>No products found</Message>
          ) : (
            <>
              <Row>
                {products.map((product) => (
                  <Col key={product._id} sm={12} md={6} lg={4} xl={3}>
                    <Product product={product} />
                  </Col>
                ))}
              </Row>
              <Paginate page={page} pages={pages} handlePageChange={handlePageChange} />
            </>
          )}
        </>
      )}
    </div>
  );
}

export default SearchResultScreen;
