import React, { useState } from 'react';
import { Form, Button } from 'react-bootstrap';
import axios from 'axios';
import api from '../utils/api';  

function ServiceForm({ onServiceSubmit, productId }) {
    const [services, setServices] = useState([]);
    const [serviceData, setServiceData] = useState({
        name: '',
        description: '',
        price: '',
        countInStock: '',
        images: [],
    });
    const [userInfo, setUserInfo] = useState(JSON.parse(localStorage.getItem('userInfo')));
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');


    const handleChange = (e) => {
        const { name, value, files } = e.target;
        setServiceData(prevData => ({
            ...prevData,
            [name]: files ? Array.from(files).slice(0, 10) : value
        }));
    };

    const addService = () => {
        setServices([...services, { ...serviceData, _id: services.length + 1 }]);
        setServiceData({
            name: '',
            description: '',
            price: '',
            countInStock: '',
            images: [],
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const formData = new FormData();
        Object.keys(serviceData).forEach(key => {
            if (key === 'images') {
                serviceData.images.forEach(image => {
                    formData.append('images', image);
                });
            } else {
                formData.append(key, serviceData[key]);
            }
        });
        formData.append('productId', productId);

        try {
            const response = await api.post('/api/products/register-service/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${JSON.parse(localStorage.getItem('userInfo')).token}`,
                },
            });
            onServiceSubmit(response.data); // Pass the response data back to parent component
        } catch (error) {
            console.error("Error registering service:", error);
        }
    };

    return (
        <Form onSubmit={handleSubmit}>
            <h4>Add Services</h4>
            <Form.Group controlId="serviceName">
                <Form.Label>Service Name</Form.Label>
                <Form.Control
                    type="text"
                    name="name"
                    value={serviceData.name}
                    onChange={handleChange}
                    placeholder="Enter service name"
                />
            </Form.Group>

            <Form.Group controlId="serviceDescription">
                <Form.Label>Service Description</Form.Label>
                <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={serviceData.description}
                    onChange={handleChange}
                    placeholder="Enter service description"
                />
            </Form.Group>

            <Form.Group controlId="servicePrice">
                <Form.Label>Service Price</Form.Label>
                <Form.Control
                    type="number"
                    name="price"
                    value={serviceData.price}
                    onChange={handleChange}
                    placeholder="Enter service price"
                />
            </Form.Group>

            <Form.Group controlId="serviceCountInStock">
                <Form.Label>Max Services You can provide per day</Form.Label>
                <Form.Control
                    type="number"
                    name="countInStock"
                    value={serviceData.countInStock}
                    onChange={handleChange}
                    placeholder="Enter count in stock"
                />
            </Form.Group>

            <Form.Group controlId="serviceImages">
                <Form.Label>Service Images (Max 10)</Form.Label>
                <Form.Control
                    type="file"
                    name="images"
                    multiple
                    onChange={handleChange}
                />
            </Form.Group>

            <Button variant="secondary" onClick={addService}>
                Add Another Service
            </Button>

            {services.length > 0 && (
                <div className="mt-3">
                    <h5>Added Services</h5>
                    <ul>
                        {services.map((service, index) => (
                            <li key={index}>
                                <h6>{service.name}</h6>
                                <p>{service.description}</p>
                                <p>Price: ${service.price}</p>
                                <p>Max per day: {service.countInStock}</p>
                                <p>Images: {service.images.length}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <Button variant="primary" type="submit" className="mt-3">
                Submit All Services
            </Button>
        </Form>
    );
}

export default ServiceForm;
