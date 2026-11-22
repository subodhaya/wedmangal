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
                        <a href="/owner-register" className="text-white mx-2"><strong>Register Your Business (Vendors)</strong></a> |
                        <a href="/blog" className="text-white mx-2">Blog</a> |
                        <a href="/faq" className="text-white mx-2">FAQ</a> |
                        <a href="/TermsAndCondition" className="text-white mx-2">Terms & Conditions</a> |
                        <a href="/RefundAndCancellation" className="text-white mx-2">Refund & Cancellation</a> |
                        <a href="/ContactUs" className="text-white mx-2">Contact Us</a> |
                        <a href="/removal-request" className="text-white mx-2">Remove or Report a Listing</a>
                    </Col>
                </Row>
            </Container>
        </footer>
    );
}

export default Footer;

