import React, { useState, useEffect } from 'react';
import { Form, Container, Button, Card, Alert,Col,Row } from 'react-bootstrap';
import axios from 'axios';
import api from '../utils/api';  
import { FaTrash, FaTimes } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

function ManagePage() {
    const [productData, setProductData] = useState({
        name: '',
        image: null,
        brand: '',
        category: '',
        description: '',
        city: '',
        area_name: '', // New Field
        address: '', // New Field
        business_phone: '',
        personal_phone: '',
        opening_time: '', // New Field
        closing_time: '', // New Field
        isApproved: false,
    });
    const [services, setServices] = useState([]);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [selectedServiceIndex, setSelectedServiceIndex] = useState(null);
    const [isSubmitDisabled, setIsSubmitDisabled] = useState(false);

    const navigate = useNavigate();
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));

    // Fetch data
    const fetchData = async () => {
        try {
            const userId = userInfo.id; // Get the user ID from local storage
            const { data } = await api.get(`/api/products/my-business/${userId}/`, {
                headers: {
                    Authorization: `Bearer ${userInfo.token}`,
                },
            });
            console.log('Fetched Data:', data); // Debugging statement
            setProductData(data);
            setServices(data.services || []);
        } catch (error) {
            setErrorMessage(error.response?.data.message || 'Error fetching data');
        }
    };

    useEffect(() => {
        fetchData();
    }, [userInfo.token]);

    // Handle form changes
    const handleProductChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'image' && files.length > 0) {
            // Set the image as a preview URL
            setProductData((prevData) => ({
                ...prevData,
                [name]: URL.createObjectURL(files[0]),  // For preview
                imageFile: files[0],  // For actual upload
            }));
        } else {
            setProductData((prevData) => ({
                ...prevData,
                [name]: value,
            }));
        }
    };
    

    
    // Handle product update
    const handleProductSubmit = async () => {
        try {
            const formData = new FormData();
            for (const [key, value] of Object.entries(productData)) {
                if (key === 'imageFile') {
                    formData.append('image', value);  // Send the actual file
                } else {
                    formData.append(key, value);
                }
            }
            if (!productData.personal_phone) {
                formData.set('personal_phone', productData.business_phone);
            }
            const response = await fetch(`/api/products/update_product/${userInfo.id}/`, {
                method: 'POST',
                body: formData,
                headers: {
                    Authorization: `Bearer ${userInfo.token}`,
                },
            });
    
            if (!response.ok) {
                throw new Error('Product update failed');
            }
    
            const result = await response.json();
            setSuccessMessage('Image updated successfully');
            setErrorMessage('');
            navigate('/services');
        } catch (error) {
            setErrorMessage('Failed to update product. Please try again.');
            setSuccessMessage('');
        }
    };
    

    useEffect(() => {
        if (successMessage || errorMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage('');
                setErrorMessage('');
            }, 4000);

            return () => clearTimeout(timer);
        }
    }, [successMessage, errorMessage]);

    return (
        <div>
        {successMessage && <div className="alert alert-success">{successMessage}</div>}
        {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}
      
        {/* Product Section */}
        <Container fluid className="front-page-container">
            <Card className="plain1-card mt-4 p-4">
                <Row className="g-0">
                        {/* Left Column - Welcome Card Content */}
                    <Col md={6} className="p-4">
                        <Card.Body>
                            <Card.Title className="text-primary display-6">
                                Welcome to Your Business Dashboard
                            </Card.Title>
                            <h4 className="mt-3 text-muted">
                                Grow your wedding business in a way that’s easy and empowering…with the most trusted brand in the industry behind you.
                            </h4>
                            <p>
                                BookYourCelebrations is the only wedding-advertising solution that combines the power of App and realtime clients to bring you better leads and more bookings.
                            </p>
                            <p>
                                Customize your business card beautifully here. First impressions matter. Make the best one and build trust while showing off your work, background, and passion.
                            </p>
                        </Card.Body>
                    </Col>

                        {/* Right Column - Image */}
                    <Col md={6} className="p-0">
                            <img
                                src="/images/makeupartist.jpg"
                                alt="Makeup Artist"
                                className="img-fluid rounded-end"
                                style={{ height: '93%', objectFit: 'cover' }}
                            />
                    </Col>
                </Row>
            </Card>
      
          {/* Form Section */}
          <Card className="mt-4">
            <Card.Body>
              <Card.Title>Manage Your Business</Card.Title>
                    <Form onSubmit={(e) => e.preventDefault()}>
                            {/* Business Form */}
                            <Form.Group controlId="name" className="d-flex align-items-center mb-3">
                                <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Business Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="name"
                                    value={productData.name || ''}
                                    onChange={handleProductChange}
                                    placeholder="Enter business name"
                                    required
                                    style={{ flexGrow: 1 }}
                                />
                            </Form.Group>

                            {/* Image Upload Field */}
                            <Form.Group controlId="image" className="d-flex align-items-center mb-3">
                                <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Business Image</Form.Label>
                                <Form.Control
                                    type="file"
                                    name="image"
                                    onChange={handleProductChange}
                                    style={{ flexGrow: 1 }}
                                />
                                {productData.image && (
                                    <div className="mt-3 position-relative">
                                        <img src={productData.image} alt="Uploaded" style={{ width: '100px', height: '100px', objectFit: 'cover' }} />
                                        <Button
                                            variant="danger"
                                            className="position-absolute top-0 end-0 p-0"
                                            style={{
                                                width: '25px',
                                                height: '25px',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                                border: 'none',
                                            }}
                                            onClick={() => setProductData((prev) => ({ ...prev, image: null }))}
                                        >
                                            <FaTimes style={{ fontSize: '14px', color: '#fff' }} />
                                        </Button>
                                    </div>
                                )}
                            </Form.Group>

                            <Form.Group controlId="brand" className="d-flex align-items-center mb-3">
                                
                             <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Brand(optional)</Form.Label>
                             
                                <Form.Control
                                    type="text"
                                    name="brand"
                                    value={productData.brand || ''}
                                    onChange={handleProductChange}
                                    placeholder="Enter brand"
                                    style={{ flexGrow: 1 }}
                                />
                            </Form.Group>

                            <Form.Group controlId="category" className="d-flex align-items-center mb-3">
                                <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Category</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="category"
                                    value={productData.category || ''}
                                    onChange={handleProductChange}
                                    placeholder="Enter category"
                                    style={{ flexGrow: 1 }}
                                />
                            </Form.Group>

                            <Form.Group controlId="description" className="d-flex align-items-center mb-3">
                                <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Description</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    name="description"
                                    value={productData.description || ''}
                                    onChange={handleProductChange}
                                    placeholder="Describe your business"
                                    style={{ flexGrow: 1 }}
                                />
                            </Form.Group>

                            <Form.Group controlId="city" className="d-flex align-items-center mb-3">
                                <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>City</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="city"
                                    value={productData.city || ''}
                                    onChange={handleProductChange}
                                    placeholder="Enter city"
                                    style={{ flexGrow: 1 }}
                                />
                            </Form.Group>
                           

<Form.Group controlId="address" className="d-flex align-items-center mb-3">
    <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Full Address</Form.Label>
    <Form.Control
        type="text"
        name="address"
        value={productData.address || ''}
        onChange={handleProductChange}
        placeholder="Enter full address"
        style={{ flexGrow: 1 }}
    />
</Form.Group>
<Form.Group controlId="area_name" className="d-flex align-items-center mb-3">
    <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Area Name</Form.Label>
    <Form.Control
        type="text"
        name="area_name"
        value={productData.area_name || ''}
        onChange={handleProductChange}
        placeholder="Enter area name"
        style={{ flexGrow: 1 }}
    />
</Form.Group>

                            <Form.Group controlId="business_phone" className="d-flex align-items-center mb-3">
                                <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Business Phone*</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="business_phone"
                                    value={productData.business_phone || ''}
                                    onChange={handleProductChange}
                                    placeholder="Enter business phone number"
                                    style={{ flexGrow: 1 }}
                                />
                            </Form.Group>

                            <Form.Group controlId="personal_phone" className="d-flex align-items-center mb-3">
                                <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Alternate Phone</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="personal_phone"
                                    value={productData.personal_phone || ''}
                                    onChange={handleProductChange}
                                    placeholder="Enter personal phone number"
                                    style={{ flexGrow: 1 }}
                                />
                            </Form.Group>


<Form.Group className="d-flex align-items-center mb-3">
    <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Opening Time</Form.Label>
    <Form.Control
        type="time"
        name="opening_time"
        value={productData.opening_time || ''}
        onChange={handleProductChange}
        style={{ flexGrow: 1, marginRight: '10px' }}
    />

    <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Closing Time</Form.Label>
    <Form.Control
        type="time"
        name="closing_time"
        value={productData.closing_time || ''}
        onChange={handleProductChange}
        style={{ flexGrow: 1 }}
    />
</Form.Group>

                            {/* Submit Button */}
                        <div className="d-flex justify-content-end">
                            <Button variant="primary" onClick={handleProductSubmit}>
                                Update/Next
                            </Button>
                        </div>
                    </Form>

                    {successMessage && (
                        <Alert variant="success" className="mt-3">
                            {successMessage}
                        </Alert>
                    )}

                    {errorMessage && (
                        <Alert variant="danger" className="mt-3">
                            {errorMessage}
                        </Alert>
                    )}
                </Card.Body>
            </Card>
        </Container>
        </div>
    );
}

export default ManagePage;
