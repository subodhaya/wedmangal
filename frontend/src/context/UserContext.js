import React, { createContext, useState, useContext } from 'react';
import axios from 'axios';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [userInfo, setUserInfo] = useState(localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')) : null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const login = async (email, password) => {
        try {
            setLoading(true);
            const { data } = await axios.post('/api/users/login', { email, password });
            setLoading(false);
            setUserInfo(data);
            localStorage.setItem('userInfo', JSON.stringify(data));
        } catch (error) {
            setLoading(false);
            setError(error.response && error.response.data.message ? error.response.data.message : error.message);
        }
    };

    const logout = () => {
        localStorage.removeItem('userInfo');
        setUserInfo(null);
    };

    return (
        <UserContext.Provider value={{ userInfo, login, logout, loading, error }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
