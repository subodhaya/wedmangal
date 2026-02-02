import React, { useState, useEffect } from 'react'
import { Form, Button, Col } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import FormContainer from '../components/FormContainer'
import CheckoutSteps from '../components/CheckoutSteps'

function PaymentScreen() {
    const navigate = useNavigate();
    const shippingAddress = JSON.parse(localStorage.getItem('shippingAddress')) || {}
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');  // Start with empty string

    useEffect(() => {
        if (!shippingAddress.address) {
            navigate('/shipping');
        }
    }, [navigate, shippingAddress.address])

    const submitHandler = (e) => {
        e.preventDefault()
        localStorage.setItem('paymentMethod', paymentMethod)
        navigate('/placeorder');
    }

    return (
        <FormContainer>
        <CheckoutSteps step1 step2 step3 />
    
        <div className="pb-5">
            <Form onSubmit={submitHandler}>
                <Form.Group>
                    <Form.Label as='legend'>Select Method</Form.Label>
                    <Col>
                        <Form.Check
                            type='radio'
                            label='Net Banking'
                            id='netbanking'
                            name='paymentMethod'
                            value='Net Banking'
                            checked={paymentMethod === 'Net Banking'}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                        />
                        <Form.Check
                            type='radio'
                            label='UPI (Google Pay, PhonePe, Paytm)'
                            id='upi'
                            name='paymentMethod'
                            value='UPI'
                            checked={paymentMethod === 'UPI'}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                        />
                        <Form.Check
                            type='radio'
                            label='Pay in Cash'
                            id='cash'
                            name='paymentMethod'
                            value='cash'
                            checked={paymentMethod === 'cash'}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                        />
                    </Col>
                </Form.Group>
    
                <Button
                    type='submit'
                    variant='primary'
                    disabled={!paymentMethod}  // Disable if no payment method is selected
                >
                    Continue
                </Button>
            </Form>
        </div>
        <div style={{ marginTop: '90px' }}></div>

    </FormContainer>
    )
}

export default PaymentScreen
