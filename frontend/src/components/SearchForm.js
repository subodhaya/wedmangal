import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../utils/api';  

function SearchForm() {
    const [city, setCity] = useState('');
    const [vendor, setVendor] = useState('');
    const navigate = useNavigate();
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            // Navigate to the search results page with query parameters
            if (city && vendor) {
                navigate(`/search?city=${city}&vendor=${vendor}`);
            } else {
                navigate('/'); // Redirect to the home page or another default route if fields are empty
            }

            // Optionally fetch data from the API if you want to show the results immediately
            const response = await api.get('/api/products/search/', {
                params: { city, vendor },
            });
            console.log('Search results:', response.data);
        } catch (error) {
            console.error('Error fetching search results:', error);
        }
    };

    return (
        <div className="container highlight-search">
            <div className="row">
                <div className="col-xs-12 col-lg text-center">
                    <form id="search-form" onSubmit={handleSubmit} className="d-flex flex-column flex-sm-row">
                        <select
                            required
                            className="form-select jp-form-input justify-content mb-2 mb-sm-0"
                            aria-label="Default select example"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                        >
                            <option value="">Select city</option>
                            <option value="Adilabad">Adilabad</option>
                            <option value="Agra">Agra</option>
                            <option value="Ahmedabad">Ahmedabad</option>
                            <option value="Ahmednagar">Ahmednagar</option>
                            <option value="Aizawl">Aizawl</option>
                            <option value="Ajitgarh(Mohali)">Ajitgarh (Mohali)</option>
                            <option value="Ajmer">Ajmer</option>
                            <option value="Akola">Akola</option>
                            <option value="Alappuzha">Alappuzha</option>
                            <option value="Chennai">Chennai</option>
                        </select>
                        <select
                            required
                            className="form-select jp-form-input"
                            id="exampleFormControlSelect1"
                            value={vendor}
                            onChange={(e) => setVendor(e.target.value)}
                        >
                            <option value="" disabled>Select Vendor</option>
                            <option value="Halls">Wedding Halls</option>
                            <option value="Hotels">Hotels</option>
                            <option value="Photographers">Photographers</option>
                            <option value="beauty">Beauty Parlour</option>
                            <option value="events">Events</option>
                        </select>
                        <button type="submit" className="btn custom-btn-primary d-flex align-items-center justify-content-center" style={{ width: '100px' }}>
                            <i className="fas fa-search mr-2"></i>Search
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default SearchForm;
