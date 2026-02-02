import React, { useState } from 'react';
import { Form, Button, Col, Row } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import FormContainer from '../components/FormContainer';
import CheckoutSteps from '../components/CheckoutSteps';

function ShippingScreen() {
    const navigate = useNavigate();

    // Load shipping address from local storage or default values
    const storedAddress = JSON.parse(localStorage.getItem('shippingAddress')) || {
        address: '',
        city: '',
        postalCode: '',
        country: ''
    };

    const [shippingAddress, setShippingAddress] = useState(storedAddress);
    const { address, city, postalCode, country } = shippingAddress;

    const [errors, setErrors] = useState({});

    // Function to handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setShippingAddress({
            ...shippingAddress,
            [name]: value
        });
    };

    // Validate form fields
    const validateFields = () => {
        let validationErrors = {};

        if (!address.trim()) validationErrors.address = "Address is required";
        if (!city.trim()) validationErrors.city = "City is required";
        if (!postalCode.trim()) validationErrors.postalCode = "Postal code is required";
        if (!country.trim()) validationErrors.country = "Country is required";

        return validationErrors;
    };

    const submitHandler = (e) => {
        e.preventDefault();

        // Validate before submission
        const validationErrors = validateFields();

        if (Object.keys(validationErrors).length === 0) {
            localStorage.setItem('shippingAddress', JSON.stringify(shippingAddress));
            navigate('/placeorder');
        } else {
            setErrors(validationErrors);
        }
    };

    return (
        <FormContainer>
            <CheckoutSteps step1 step2 />
            <h1>Event Address</h1>
            <Form onSubmit={submitHandler}>

                <Form.Group controlId='address'>
                    <Form.Label>Address</Form.Label>
                    <Form.Control
                        name='address'
                        required
                        type='text'
                        placeholder='Enter address'
                        value={address}
                        onChange={handleInputChange}
                        isInvalid={!!errors.address}
                    />
                    <Form.Control.Feedback type="invalid">
                        {errors.address}
                    </Form.Control.Feedback>
                </Form.Group>

                <Form.Group controlId='city'>
                    <Form.Label>City</Form.Label>
                    <Form.Control
                        name='city'
                        required
                        type='text'
                        placeholder='Enter city'
                        value={city}
                        onChange={handleInputChange}
                        isInvalid={!!errors.city}
                    />
                    <Form.Control.Feedback type="invalid">
                        {errors.city}
                    </Form.Control.Feedback>
                </Form.Group>

                <Form.Group controlId='postalCode'>
                    <Form.Label>Postal Code</Form.Label>
                    <Form.Control
                        name='postalCode'
                        required
                        type='text'
                        placeholder='Enter postal code'
                        value={postalCode}
                        onChange={handleInputChange}
                        isInvalid={!!errors.postalCode}
                    />
                    <Form.Control.Feedback type="invalid">
                        {errors.postalCode}
                    </Form.Control.Feedback>
                </Form.Group>

                <Form.Group controlId='country'>
                    <Form.Label>Country</Form.Label>
                    <Form.Control
                        name='country'
                        required
                        type='text'
                        placeholder='Enter country'
                        value={country}
                        onChange={handleInputChange}
                        isInvalid={!!errors.country}
                    />
                    <Form.Control.Feedback type="invalid">
                        {errors.country}
                    </Form.Control.Feedback>
                </Form.Group>

                <Button type='submit' variant='primary' className='mt-3'>
                    Continue
                </Button>
            </Form>
        </FormContainer>
    );
}

export default ShippingScreen;
