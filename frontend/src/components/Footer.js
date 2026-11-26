import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';

function Footer() {
    return (
        <footer className="bg-dark text-white py-3">
            <Container>
                <Row className="text-center">
                    <Col md={6} className="py-2">
                        <p className="mb-0">&copy; {new Date().getFullYear()} WedMangal. All Rights Reserved.</p>
                    </Col>
                    <Col md={6} className="py-2">
                        <a href="/list-your-business" className="text-white mx-2"><strong>List Your Wedding Business Free</strong></a> |
                        <a href="/blog" className="text-white mx-2">Blog</a> |
                        <a href="/faq" className="text-white mx-2">FAQ</a> |
                        <a href="/TermsAndCondition" className="text-white mx-2">Terms & Conditions</a> |
                        <a href="/privacy-policy" className="text-white mx-2">Privacy Policy</a> |
                        <a href="/RefundAndCancellation" className="text-white mx-2">Refund & Cancellation</a> |
                        <a href="/ContactUs" className="text-white mx-2">Contact Us</a> |
                        <a href="/removal-request" className="text-white mx-2">Remove or Report a Listing</a>
                    </Col>
                </Row>
                {/* Plain links (not React Router): these pages are server-rendered by Django (base/landing.py) */}
                <Row className="text-center small">
                    <Col className="py-1">
                        Wedding vendors in{' '}
                        <a href="/chennai" className="text-white mx-1">Chennai</a> ·
                        <a href="/bangalore" className="text-white mx-1">Bangalore</a> ·
                        <a href="/hyderabad" className="text-white mx-1">Hyderabad</a>
                    </Col>
                </Row>
            </Container>
        </footer>
    );
}

export default Footer;

