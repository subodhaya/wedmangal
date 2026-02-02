import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert ,Col,Row} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import axios from 'axios';
import api from '../utils/api';  
import '../screens/HomeScreen.css';



const AddProductPage = () => {
    const [userInfo, setUserInfo] = useState(JSON.parse(localStorage.getItem('userInfo')));
    const [productData, setProductData] = useState({
        name: '',
        image: '',
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
    });

    const [services, setServices] = useState([
        { name: '', description: '', price: '', countInStock: '', images: [] }
    ]);

    const [isFormVisible, setIsFormVisible] = useState(true);
    const [responseMessage, setResponseMessage] = useState('');
    const [error, setError] = useState('');

    const handleProductChange = (e) => {
        const { name, value, files } = e.target;
        setProductData({
            ...productData,
            [name]: files ? files[0] : value,
        });
    };

    const handleServiceChange = (index, e) => {
        const { name, value } = e.target;
        const updatedServices = [...services];
        updatedServices[index][name] = value;
        setServices(updatedServices);
    };

    const handleImageChange = (index, e) => {
        const files = Array.from(e.target.files);
        const updatedServices = [...services];
        updatedServices[index].images = files;
        setServices(updatedServices);
    };

    const handleAddService = () => {
        setServices([
            ...services,
            { name: '', description: '', price: '', countInStock: '', images: [] }
        ]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // If personal phone is empty, use business phone as personal phone
        const finalProductData = {
            ...productData,
            personal_phone: productData.personal_phone || productData.business_phone
        };

        const formData = new FormData();

        // Append product data
        Object.keys(finalProductData).forEach(key => {
            formData.append(key, finalProductData[key]);
        });

        // Append services data
        services.forEach((service, index) => {
            formData.append(`services[${index}][name]`, service.name);
            formData.append(`services[${index}][description]`, service.description);
            formData.append(`services[${index}][price]`, service.price);
            formData.append(`services[${index}][countInStock]`, 1);
            service.images.forEach((image, imgIndex) => {
                formData.append(`services[${index}][images][${imgIndex}]`, image);
            });
        });

        try {
            const response = await api.post('/api/products/register-product/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${userInfo.token}`,
                },
            });

            // Clear the form after a successful submission
            setProductData({
                name: '',
                image: '',
                brand: '',
                category: '',
                description: '',
                city: '',
                area_name: '',
                address: '',
                business_phone: '',
                personal_phone: '',
                opening_time: '',
                closing_time: '',
            });

            setServices([ { name: '', description: '', price: '', countInStock: '', images: [] } ]);
            setResponseMessage('Product and services submitted successfully!');
            setError('');
        } catch (err) {
            setError('An error occurred while submitting the form. You can register only 1 business and add many services. Please try again.');
            setResponseMessage('');
        }
    };

    return (
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
                                <p>If you have already saved your business details, click here to edit or add more services.</p>
                            <Link to="/manage-my-page">
                                <Button variant="primary">Go to Manage My Page</Button>
                            </Link>
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

                {/* Manage Your Business Section */}
                <Container className="form-container"  style={{marginTop: 7 }} >
                    <div className="highlight-section">
                        <div className="col-xs-12 text-center">
                            <h2>Manage Your Business</h2>
                            <p className="lead text-muted">
                                A streamlined dashboard to help you showcase your services and connect with clients.
                            </p>
    
                            {isFormVisible && (
                <Form onSubmit={handleSubmit}>
                                    <Form.Group controlId="name" className="d-flex align-items-center mb-3">
                                        <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Business Name</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="name"
                                            value={productData.name}
                                            onChange={handleProductChange}
                                            placeholder="Enter business name"
                                            required
                                            style={{ flexGrow: 1 }}
                                        />
                    </Form.Group>

                                    <Form.Group controlId="image" className="d-flex align-items-center mb-3">
                                        <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Business Image</Form.Label>
                                        <Form.Control
                                            type="file"
                                            name="image"
                                            onChange={handleProductChange}
                                            style={{ flexGrow: 1 }}
                                        />
                    </Form.Group>

                                    <Form.Group controlId="brand" className="d-flex align-items-center mb-3">
                                        <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Brand</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="brand"
                                            value={productData.brand}
                                            onChange={handleProductChange}
                                            placeholder="Enter brand"
                                            style={{ flexGrow: 1 }}
                                        />
                                    </Form.Group>
    
                                    <Form.Group controlId="category" className="d-flex align-items-center mb-3 position-relative">
    <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Category</Form.Label>
    <div style={{ position: 'relative', width: '100%' }}>
        <Form.Control
            as="select"
            name="category"
            value={productData.category}
            onChange={handleProductChange}
            required
            style={{
                flexGrow: 1,
                paddingRight: '30px', // Add space for the icon
                appearance: 'none', // Remove default dropdown styling
            }}
        >
            <option value="" disabled>Select a category</option>
            <option value="Makeup_Artist">Makeup Artist</option>
            <option value="Photographers">Photographers</option>
            <option value="Caterers">Caterers</option>
            <option value="Planners">Planners</option>
            <option value="Halls">Halls</option>
            <option value="Decorators">Decorators</option>
            <option value="Mehandi_Artist">Mehandi Artist</option>
            <option value="Invitation">Invitation</option>
            <option value="Jewellery">Jewellery</option>
            <option value="DJ_Artist">DJ Artist</option>
            <option value="Travel_Transport">Travel and Transport</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Pandit">Pandit</option>
        </Form.Control>
        {/* Down arrow icon */}
        <i
            className="fa fa-caret-down"
            style={{
                position: 'absolute',
                top: '50%',
                right: '10px',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
            }}
        ></i>
    </div>


</Form.Group>

    
                                    <Form.Group controlId="description" className="d-flex align-items-center mb-3">
                                        <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Description</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={3}
                                            name="description"
                                            value={productData.description}
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
        value={productData.city}
        onChange={handleProductChange}
        placeholder="Enter city"
        style={{ flexGrow: 1 }}
    />
</Form.Group>

<Form.Group controlId="area_name" className="d-flex align-items-center mb-3">
    <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Area Name</Form.Label>
    <Form.Control
        type="text"
        name="area_name"
        value={productData.area_name}
        onChange={handleProductChange}
        placeholder="Enter area name"
        style={{ flexGrow: 1 }}
    />
</Form.Group>

<Form.Group controlId="address" className="d-flex align-items-center mb-3">
    <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Full Address</Form.Label>
    <Form.Control
        type="text"
        name="address"
        value={productData.address}
        onChange={handleProductChange}
        placeholder="Enter full address"
        style={{ flexGrow: 1 }}
    />
</Form.Group>

                                    <Form.Group controlId="business_phone" className="d-flex align-items-center mb-3">
                                        <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Business Ph </Form.Label>
                                        <Form.Control
                                            type="tel"
                                            name="business_phone"
                                            value={productData.business_phone}
                                            onChange={handleProductChange}
                                            placeholder="Enter business phone number"
                                            style={{ flexGrow: 1 }}
                                        />
                    </Form.Group>

                                    <Form.Group controlId="personal_phone" className="d-flex align-items-center mb-3">
                                        <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Alternative Phone(optional)</Form.Label>
                                        <Form.Control
                                            type="tel"
                                            name="personal_phone"
                                            value={productData.personal_phone}
                                            onChange={handleProductChange}
                                            placeholder="Enter personal phone number"
                                            required
                                            style={{ flexGrow: 1 }}
                                        />
                    </Form.Group>
                    <Form.Group className="d-flex align-items-center mb-3" style={{ gap: '10px', flexWrap: 'wrap' }}>
    <div className="d-flex align-items-center">
        <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' , whiteSpace: 'nowrap' }}>Opening Time</Form.Label>
        <Form.Control
            type="time"
            name="opening_time"
            value={productData.opening_time}
            onChange={handleProductChange}
            style={{ width: '150px' }} // Compact width
        />
    </div>

    <div className="d-flex align-items-center">
        <Form.Label className="mb-0 me-2" style={{ whiteSpace: 'nowrap' }}>Closing Time</Form.Label>
        <Form.Control
            type="time"
            name="closing_time"
            value={productData.closing_time}
            onChange={handleProductChange}
            style={{ width: '120px' }} // Compact width
        />
    </div>
</Form.Group>


                                    <hr />
    
                                    <h4>Services</h4>
    
                                    {services.map((service, index) => (
                                        <div key={index}>
                                            <Form.Group controlId={`serviceName${index}`} className="d-flex align-items-center mb-3">
                                                <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Service Name</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="name"
                                                    value={service.name}
                                                    onChange={(e) => handleServiceChange(index, e)}
                                                    placeholder="Enter service name"
                                                    style={{ flexGrow: 1 }}
                                                />
                    </Form.Group>

                                            <Form.Group controlId={`serviceDescription${index}`} className="d-flex align-items-center mb-3">
                                                <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Service Description</Form.Label>
                                                <Form.Control
                                                    as="textarea"
                                                    rows={3}
                                                    name="description"
                                                    value={service.description}
                                                    onChange={(e) => handleServiceChange(index, e)}
                                                    placeholder="Describe the service"
                                                    style={{ flexGrow: 1 }}
                                                />
                                            </Form.Group>
    
                                            <Form.Group controlId={`servicePrice${index}`} className="d-flex align-items-center mb-3">
                                                <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Price</Form.Label>
                                                <Form.Control
                                                    type="number"
                                                    step="0.01"
                                                    name="price"
                                                    value={service.price}
                                                    onChange={(e) => handleServiceChange(index, e)}
                                                    placeholder="Enter service price"
                                                    style={{ flexGrow: 1 }}
                                                />
                                            </Form.Group>
    
                                            <Form.Group controlId={`serviceCountInStock${index}`} className="d-none">
    <Form.Control
        type="number"
        name="No of events you can provide per day"
        value={service.countInStock || 5} // Default to 5 if undefined
        onChange={(e) => handleServiceChange(index, e)}
        placeholder="Enter number of events you can provide per day"
    />
</Form.Group>

    
                                            <Form.Group controlId={`serviceImages${index}`} className="d-flex align-items-center mb-3">
                                                <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Service Images</Form.Label>
                                                <Form.Control
                                                    type="file"
                                                    multiple
                                                    name="images"
                                                    onChange={(e) => handleImageChange(index, e)}
                                                    style={{ flexGrow: 1 }}
                                                />
                    </Form.Group>

                                            <hr />
                                        </div>
                                    ))}
    
                                    <Button variant="primary" onClick={handleAddService}>
                                        Add Another Service
                                    </Button>
    
                                    <div className="d-grid gap-2 mt-4">
                    <Button type="submit" variant="success">Submit</Button>
                                    </div>
                </Form>
                            )}

                {responseMessage && <Alert variant="success">{responseMessage}</Alert>}
                {error && <Alert variant="danger">{error}</Alert>}
                        </div>
                    </div>
            </Container>
        </Container>
    );
};

export default AddProductPage;
