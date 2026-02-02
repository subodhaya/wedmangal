import { useState, useEffect } from 'react';
import { Container, Card, Form, Button } from 'react-bootstrap';
import { FaTrash, FaTimes } from 'react-icons/fa';
import axios from 'axios';
import api from '../utils/api';  
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';

const ServicePage = () => {
    const [services, setServices] = useState([]);
    const [selectedServiceIndex, setSelectedServiceIndex] = useState(null); // Track which service is selected for updating
    const [successMessage, setSuccessMessage] = useState('');
    const { productId } = useParams();
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitDisabled, setIsSubmitDisabled] = useState(false);
    const [productData, setProductData] = useState({});
    const [newService, setNewService] = useState({
        name: '',
        description: '',
        price: '',
        countInStock: '',
        images: [],
        
    });
    const [image, setImage] = useState(null);

    const navigate = useNavigate();
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));

    const fetchData = async () => {
        try {
            const userId = userInfo.id;
            const { data } = await api.get(`/api/products/my-business/${userId}/`, {
                headers: {
                    Authorization: `Bearer ${userInfo.token}`,
                },
            });
            setProductData(data);
            setServices(data.services || []);
        } catch (error) {
            setErrorMessage(error.response?.data.message || 'Error fetching data');
        }
    };

    useEffect(() => {
        if (userInfo?.token) {
            fetchData();
        }
    }, [userInfo?.token]);

    

// Retrieve the stored service index from local storage
const storedSelectedServiceIndex = localStorage.getItem('selectedServiceIndex');

// Set the selected service index if stored
if (storedSelectedServiceIndex !== null) {
    const index = parseInt(storedSelectedServiceIndex, 10);
    if (!isNaN(index) && index >= 0 && index < services.length) {
        setSelectedServiceIndex(index);
        localStorage.removeItem('selectedServiceIndex'); // Clear the stored index after use
    }
}

    const handleServiceClick = (index) => {
        const selectedService = services[index];
        setSelectedServiceIndex(index);
        setNewService({
            ...selectedService, // Populate form with selected service details
            images: selectedService.images || [], // Ensure images are set properly
        });
    };
    
    const renderImages = (images = []) => {
        console.log('Images:', images); // Log the images array
    
        return images.map((imgObj, imgIndex) => {
            // Check if imgObj has a preview URL (for local previews) or an image URL (from the server)
            const imageUrl = imgObj.preview || imgObj.image;
    
            if (imageUrl) {
                console.log('Rendering image:', imageUrl); // Log the image URL being rendered
    
                return (
                    <div
                        key={imgIndex}
                        className="me-2 mb-2 position-relative"
                        style={{ width: '100px', height: '100px', borderRadius: '8px', overflow: 'hidden' }}
                    >
                        <img
                            src={`/images/imageUrl`}
                            alt={`service image ${imgIndex}`}
                            className="img-fluid"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <Button
                            size="sm"
                            variant="light"
                            className="position-absolute top-0 start-100 translate-middle border rounded-circle"
                            onClick={() => handleDeleteServiceImage(selectedServiceIndex, imgIndex)}
                        >
                            <FaTimes />
                        </Button>
                    </div>
                );
            } else {
                console.log('Invalid image format:', imgObj); // Log invalid image data
            }
            return null; // Skip invalid image formats
        });
    };
    
    
    
    
    

    const handleServiceChange = (event) => {
        const { name, value } = event.target;
        setNewService({ ...newService, [name]: value });
    };

    
    
    

    const handleDeleteServiceImage = async (serviceIndex, imgIndex) => {
        const updatedServices = [...services];
        const deletedImage = updatedServices[serviceIndex].images[imgIndex];

        updatedServices[serviceIndex].images.splice(imgIndex, 1);
        setServices(updatedServices);

        try {
            await api.put(`/api/products/${services[serviceIndex]._id}/remove-service-image/`, { image: deletedImage }, {
                headers: {
                    Authorization: `Bearer ${userInfo.token}`,
                },
            });
        } catch (error) {
            setErrorMessage(error.response?.data.message || 'Error deleting image');
        }
    };
    const handleDeleteService = async (index) => {
        const serviceId = services[index]._id; // Get the service ID to delete
        try {
            await api.delete(`/api/products/delete_service/${serviceId}/`, {
                headers: {
                    'Authorization': `Bearer ${userInfo.token}`,
                },
            });
    
            // Remove the service from the state if the deletion is successful
            const updatedServices = services.filter((_, i) => i !== index);
            setServices(updatedServices);
             
        } catch (error) {
            setErrorMessage(error.response?.data.message || 'Error deleting service');
        }
    };
    
    

    
   
    const handleImageChange = async (event) => {
        if (!event || !event.target) {
            console.error('Event or event.target is undefined');
            return;
        }
    
        const files = Array.from(event.target.files);
        const serviceId = services[selectedServiceIndex]?._id;
    
        if (!serviceId) {
            console.error('Service ID is undefined');
            return;
        }
    
        // Generate preview URLs and set images for display
        const previewImages = files.map((file) => ({
            preview: URL.createObjectURL(file), // For preview
            file, // For actual upload
        }));
    
        // Update state with preview images
        setNewService((prevService) => ({
            ...prevService,
            images: [...prevService.images, ...previewImages],
        }));
    
        // Prepare the form data for uploading
        const formData = new FormData();
        files.forEach((file) => {
            formData.append('images', file);  // 'images' should match the field name in your Django view
        });
    
        try {
            const response = await fetch(`/api/products/${serviceId}/images/upload/`, {
                method: 'POST',
                body: formData,
                headers: {
                    Authorization: `Bearer ${userInfo.token}`,
                },
            });
    
            if (response.ok) {
                const data = await response.json();
                console.log('Uploaded images:', data);
    
                // Store the selectedServiceIndex before reloading
                localStorage.setItem('selectedServiceIndex', selectedServiceIndex);
    

            } else {
                console.error('Image upload failed');
            }
            setSuccessMessage('image uploaded successfully!');
        } catch (error) {
            setErrorMessage(error.response?.data.message || 'Error uploading images');
        }
    };
    
    
    
    
    


    const handleServiceSubmit = async () => {
        if (selectedServiceIndex === null) {
            // Adding a new service
            try {
                const newServiceWithProductId = { ...newService, _id: productId };  // Add productId to the service data
                
                // Create FormData to handle images
                const formData = new FormData();
                formData.append('name', newService.name || '');
                formData.append('description', newService.description || '');
                formData.append('price', newService.price || '0');  // Ensure default value if empty
                formData.append('countInStock', newService.countInStock || '0');  // Ensure default value if empty
                formData.append('rating', newService.rating || '1');  // Default to 1
                formData.append('numReviews', newService.numReviews || '0');
                // Add images if any
                newService.images.forEach((file) => {
                    formData.append('images', file);  // Append each file to the form data
                });
                
                // Add the service
                const { data } = await api.post(`/api/products/add_service/`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${userInfo.token}`,
                    },
                });
                
                setServices([...services, data]); // Add the new service to the list
                setNewService({ name: '', description: '', price: '', countInStock: '', images: [] }); // Reset form
            setSuccessMessage('Service added successfully!');
        } catch (error) {
            setErrorMessage(error.response?.data.message || 'Error adding service');
        }
        } else {
            // Updating an existing service
            try {
                const updatedService = { ...newService };
                
                // Create FormData to handle images and other data
                const formData = new FormData();
                formData.append('name', newService.name || '');
                formData.append('description', newService.description || '');
                formData.append('price', newService.price || '0');
                formData.append('countInStock', newService.countInStock || '0');
                formData.append('rating', newService.rating || '1');
                formData.append('numReviews', newService.numReviews || '0');
                
                newService.images.forEach((file) => {
                    formData.append('images', file);
                });
                
                await api.put(`/api/products/update_service/${services[selectedServiceIndex]._id}/`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${userInfo.token}`,
                    },
                });
                
                // Update the service in the local state
                const updatedServices = [...services];
                updatedServices[selectedServiceIndex] = updatedService;
                setServices(updatedServices);
                setNewService({ name: '', description: '', price: '', countInStock: '', images: [] });
                setSelectedServiceIndex(null);
                setSuccessMessage('Service updated successfully!');
        } catch (error) {
            setErrorMessage(error.response?.data.message || 'Failed to update service');
        }
        };
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

<Container>
    <Card>
        <Card.Body>
            <h6>Your services are listed below. Click on a service to update it.</h6>
            <hr />
            <ul>
                {services.map((service, index) => (
                    <li key={index} className="d-flex align-items-left mb-2">
                        <span
                            onClick={() => handleServiceClick(index)}
                            style={{ color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}
                        >
                            {service.name ? service.name : 'Unnamed Service'}
                        </span>
                        <Button
                            variant="link"
                            style={{ color: 'red' }}
                            onClick={() => handleDeleteService(index, 0)}
                        >
                            <FaTrash />
                        </Button>
                    </li>
                ))}
            </ul>
            <hr />
            <h4>{selectedServiceIndex === null ? 'Add New Service' : 'Update Service'}</h4>
            <Form.Group controlId="serviceName" className="d-flex align-items-center mb-3">
                <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Service Name</Form.Label>
                <Form.Control
                    type="text"
                    name="name"
                    value={newService.name}
                    onChange={handleServiceChange}
                    placeholder="Enter service name"
                    style={{ flexGrow: 1 }}
                />
            </Form.Group>
            <Form.Group controlId="serviceDescription" className="d-flex align-items-center mb-3">
                <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Service Description</Form.Label>
                <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={newService.description}
                    onChange={handleServiceChange}
                    placeholder="Describe the service"
                    style={{ flexGrow: 1 }}
                />
            </Form.Group>
            <Form.Group controlId="servicePrice" className="d-flex align-items-center mb-3">
                <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Price</Form.Label>
                <Form.Control
                    type="number"
                    name="price"
                    value={newService.price}
                    onChange={handleServiceChange}
                    placeholder="Enter price"
                    style={{ flexGrow: 1 }}
                />
            </Form.Group>
            <Form.Group controlId="serviceStock" className="d-flex align-items-center mb-3">
                <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Stock</Form.Label>
                <Form.Control
                    type="number"
                    name="countInStock"
                    value={newService.countInStock}
                    onChange={handleServiceChange}
                    placeholder="Enter stock count"
                    style={{ flexGrow: 1 }}
                />
            </Form.Group>
            <Form.Group controlId="serviceImages" className="d-flex flex-column align-items-start mb-3">
    <div className="d-flex align-items-center w-100">
        <Form.Label className="mb-0 me-3" style={{ minWidth: '150px' }}>Images (max 5)</Form.Label>
        <Form.Control
            type="file"
            multiple
            onChange={handleImageChange}
            style={{ flexGrow: 1 }}
        />
    </div>
    <div className="mt-3 d-flex flex-wrap">
        {renderImages(newService?.images)}
    </div>
</Form.Group>
    

            <Button
                variant="primary"
                onClick={handleServiceSubmit}
                disabled={isSubmitDisabled}
            >
                {selectedServiceIndex === null ? 'Add Service' : 'Update Service'}
            </Button>
        </Card.Body>
    </Card>
</Container>
</div>
);
};

export default ServicePage;  