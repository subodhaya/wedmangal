import React from 'react';
import { Link } from 'react-router-dom';
import { Container } from 'react-bootstrap';

function HomeInvitePage() {
    return (
        <Container className="form-container d-flex justify-content-center align-items-center" style={{ marginTop: '30px' }}>
            
             <div className="plain-card">                
                <div className="col-xs-12 text-center">
                    <h2>Creating your free invitation is simple</h2>

                    <p>Click on "Prepare Your Invite" to create a new invitation.</p>
                    <Link to="/invite">
                        <button className="btn btn-tertiary">Prepare Your Invite</button>
                    </Link>
                </div>
         
            </div>
        </Container>
    );
}

export default HomeInvitePage;
