import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const GoogleLoginCallback = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Parse URL params
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get('access');
        const refreshToken = urlParams.get('refresh');
        const userData = {
            id: urlParams.get('id'),
            username: urlParams.get('username'),
            email: urlParams.get('email'),
        };

        // Log the tokens and user data for debugging
        console.log("Access Token:", accessToken);
        console.log("Refresh Token:", refreshToken);
        console.log("User Data:", userData);

        if (accessToken && refreshToken) {
            // Save the tokens and user data in local storage or state
            localStorage.setItem('userInfo', JSON.stringify({
                access: accessToken,
                refresh: refreshToken,
                user: userData,
            }));

            // Redirect or update state
            navigate('/');
            window.location.reload();
        } else {
            // Handle error
            console.error("Tokens not found in URL");
        }
    }, [navigate]);

    return (
        <div>
            <p>Redirecting...</p>
        </div>
    );
};

export default GoogleLoginCallback;
