import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api from '../utils/api';  
import { LinkContainer } from 'react-router-bootstrap';
import { Table, Button, Row, Col } from 'react-bootstrap';
import Loader from '../components/Loader';
import Message from '../components/Message';
import { useNavigate, useLocation } from 'react-router-dom';

function ProductListScreen() {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [errorDelete, setErrorDelete] = useState('');
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [errorCreate, setErrorCreate] = useState('');
  const [createdProduct, setCreatedProduct] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));

    if (!userInfo || userInfo.isAdmin) {
      navigate('/login');
    } else {
      fetchProducts(location.search);
    }
  }, [navigate, location.search]);

  const fetchProducts = async (keyword = '') => {
    try {
      setLoading(true);
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));

      const { data } = await api.get(`/api/products${keyword}/all`, {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      });

      setProducts(data.products);
      setPage(data.page);
      setLoading(false);
    } catch (error) {
      setError(error.response && error.response.data.detail ? error.response.data.detail : error.message);
      setLoading(false);
    }
  };

  const deleteProduct = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        setLoadingDelete(true);
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));

        await api.delete(`/api/products/delete/${id}/`, {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        });

        setLoadingDelete(false);
        fetchProducts(location.search);
      } catch (error) {
        setErrorDelete(error.response && error.response.data.detail ? error.response.data.detail : error.message);
        setLoadingDelete(false);
      }
    }
  };

  const createProduct = async () => {
    try {
      setLoadingCreate(true);
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));

      const { data } = await api.post(`/api/products/create/`, {}, {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      });

      setLoadingCreate(false);
      setCreatedProduct(data);
      navigate(`/admin/product/${data._id}/edit`);
    } catch (error) {
      setErrorCreate(error.response && error.response.data.detail ? error.response.data.detail : error.message);
      setLoadingCreate(false);
    }
  };

  return (
    <div>
      <Row className='align-items-center'>
        <Col>
          <h1>Services</h1>
        </Col>
        <Col className='text-right'>
          <Button className='my-3' onClick={createProduct}>
            <i className='fas fa-plus'></i> Create service
          </Button>
        </Col>
      </Row>

      {loadingDelete && <Loader />}
      {errorDelete && <Message variant='danger'>{errorDelete}</Message>}

      {loadingCreate && <Loader />}
      {errorCreate && <Message variant='danger'>{errorCreate}</Message>}

      {loading ? <Loader /> : error ? <Message variant='danger'>{error}</Message> : (
        <Table striped bordered hover responsive className='table-sm'>
          <thead>
            <tr>
              <th>ID</th>
              <th>NAME</th>
              <th>PRICE</th>
              <th>CATEGORY</th>
              <th>BRAND</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product._id}>
                <td>{product._id}</td>
                <td>{product.name}</td>
                <td>₹{product.price}</td>
                <td>{product.category}</td>
                <td>{product.brand}</td>
                <td>
                  <LinkContainer to={`/admin/product/${product._id}/edit`}>
                    <Button variant='light' className='btn-sm'>
                      <i className='fas fa-edit'></i>
                    </Button>
                  </LinkContainer>
                  <Button variant='danger' className='btn-sm' onClick={() => deleteProduct(product._id)}>
                    <i className='fas fa-trash'></i>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

export default ProductListScreen;
