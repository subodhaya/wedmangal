import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import axios from 'axios';
import api from '../utils/api';  





const DateCalculation = () => {
  const [weddingDate, setWeddingDate] = useState('');
  const [result, setResult] = useState('');
  const [dateSet, setDateSet] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  // Assuming userInfo is stored in localStorage
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  const userId = userInfo ? userInfo._id : null;

  useEffect(() => {
    // Retrieve the stored wedding date for the current user from localStorage when the component mounts
    if (userId) {
      const storedDate = localStorage.getItem(`weddingDate_${userId}`);
      if (storedDate) {
        setWeddingDate(storedDate);
        calculateTimeLeft(storedDate);
        //syncDateWithDB(storedDate); // Sync with DB on component mount
      }
    }
  }, [userId]);

  // Function to sync wedding date with the database
  const syncDateWithDB = async (date) => {
    try {
      await api.post(
        '/api/users/wedding-date/',
        { weddingDate: date },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${JSON.parse(localStorage.getItem('userInfo')).token}`
        }
        }
      );
      console.log('Wedding date synced with DB');
    } catch (error) {
      setErrorMessage(error.response?.data.message || 'Error syncing wedding date with DB');
  }
  };

  const calculateTimeLeft = (date) => {
    const weddingDateObj = new Date(date);
    const today = new Date();

    // Calculate the difference in milliseconds
    const difference = weddingDateObj.getTime() - today.getTime();

    // Convert milliseconds to days
    const daysLeft = Math.ceil(difference / (1000 * 3600 * 24));

    if (daysLeft > 0) {
      if (daysLeft > 15) {
        const weeksLeft = Math.floor(daysLeft / 7);
        const monthsLeft = (daysLeft / 30.44).toFixed(1);

        let resultText = `There are ${daysLeft} days left until your special occasion!`;

        if (weeksLeft < 5) {
          resultText += ` That's roughly ${weeksLeft} weeks left.`;
        }
        if (monthsLeft > 1) {
          resultText += ` That is ${monthsLeft} months left.`;
        }

        setResult(resultText);
      } else {
        setResult(`There are ${daysLeft} days left until your special occasion!`);
      }
    } else if (daysLeft === 0) {
      setResult('Today is your special occasion!');
    } else {
      setResult('Your special occasion has already passed!');
    }
    setDateSet(true);
  };

  const handleDateChange = (event) => {
    setWeddingDate(event.target.value);
  };

  const handleSaveDate = () => {
    if (userId) {
      // Save date to localStorage
      localStorage.setItem(`weddingDate_${userId}`, weddingDate);

      // Sync the wedding date with the database
      syncDateWithDB(weddingDate);

      // Calculate the time left based on the newly set wedding date
      calculateTimeLeft(weddingDate);
    }
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
    <div className="container-fluid" style={{ marginTop: '30px' }} >
      <div className="plain-card" style={{ marginBottom: '30px' }} >
      
        <div className="col-xs-12 text-center">
          {!dateSet && (
            <>
              <label htmlFor="weddingDate"><b>When is your special occasion?</b></label>
              <input
                type="date"
                id="weddingDate"
                value={weddingDate}
                onChange={handleDateChange}
              />
              <Button variant="outline-warning" onClick={handleSaveDate}>
                Save Date
              </Button>
            </>
          )}
          <h4 id="result">{result}</h4>
        </div>
        
      </div>
    </div>
    </div>
  );
};

export default DateCalculation;
