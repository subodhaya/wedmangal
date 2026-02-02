import React, { useEffect, useState } from 'react';
import { Table, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import axios from 'axios';
import api from '../utils/api';  

const ProductApprovalScreen = ({ history }) => {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        const fetchProducts = async () => {
            const { data } = await api.get('/api/products/');
            setProducts(data);
        };

        fetchProducts();
    }, []);

    const approveHandler = async (id) => {
        if (window.confirm('Are you sure you want to approve this product?')) {
            await api.put(`/api/products/${id}/approve/`);
            setProducts(products.map((product) =>
                product._id === id ? { ...product, is_approved: true } : product
            ));
        }
    };

    return (
        <>
            <h1>Products</h1>
            <Table striped bordered hover responsive className='table-sm'>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>NAME</th>
                        <th>PRICE</th>
                        <th>CATEGORY</th>
                        <th>BRAND</th>
                        <th>APPROVED</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((product) => (
                        <tr key={product._id}>
                            <td>{product._id}</td>
                            <td>{product.name}</td>
                            <td>${product.price}</td>
                            <td>{product.category}</td>
                            <td>{product.brand}</td>
                            <td>{product.is_approved ? 'Yes' : 'No'}</td>
                            <td>
                                <Button
                                    variant='light'
                                    className='btn-sm'
                                    onClick={() => approveHandler(product._id)}
                                    disabled={product.is_approved}
                                >
                                    Approve
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </>
    );
};

export default ProductApprovalScreen;
