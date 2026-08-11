// src/screens/AddPhoneScreen.jsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { setUserInfo } from '../components/localStorage';
import PhoneOtpStep from '../components/PhoneOtpStep';
import '../components/ClaimModal.css';
import './LoginScreen.css';

function AddPhoneScreen() {
    const location = useLocation();
    const navigate  = useNavigate();

    const redirect = new URLSearchParams(location.search).get('redirect') || '/';

    const handleVerified = (data) => {
        setUserInfo(data);
        navigate(redirect);
    };

    return (
        <div className="ls-page">
            <div className="ls-side">
                <div className="ls-side-inner">
                    <p className="ls-side-eyebrow">✦ One last step ✦</p>
                    <h2 className="ls-side-title">Add your phone number</h2>
                    <p className="ls-side-sub">
                        We're moving to phone-based login. Add and verify your number so you can log in
                        without a password next time.
                    </p>
                    <div className="ls-side-ornament">❧</div>
                    <p className="ls-side-brand">WedMangal</p>
                </div>
                <div className="ls-side-orb ls-side-orb--1" />
                <div className="ls-side-orb ls-side-orb--2" />
            </div>

            <div className="ls-form-panel">
                <div className="ls-card">
                    <div className="ls-card-header">
                        <p className="ls-eyebrow">Almost done</p>
                        <h1 className="ls-title">Add Your Phone</h1>
                        <div className="ls-header-rule">
                            <span /><span className="ls-diamond">◆</span><span />
                        </div>
                    </div>

                    <PhoneOtpStep
                        sendUrl="/api/users/profile/phone/send-otp/"
                        verifyUrl="/api/users/profile/phone/verify-otp/"
                        onVerified={handleVerified}
                        phoneDesc="Enter your mobile number. We'll send a 6-digit code to verify and link it to your account."
                        verifyButtonLabel="Verify & Continue ✓"
                    />

                    <p className="ls-tab-switch">
                        <button type="button" className="ls-tab-link" onClick={() => navigate(redirect)}>
                            Skip for now
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default AddPhoneScreen;
