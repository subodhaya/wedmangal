import React from 'react';
import { Navigate } from 'react-router-dom';
// localStorage.js
export const getUserInfo = () => {
    return JSON.parse(localStorage.getItem('userInfo'));
  };
  
  export const setUserInfo = (userInfo) => {
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
  };
  