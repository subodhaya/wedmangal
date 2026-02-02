import React, { useState } from 'react';
import { Button, Form, FormControl } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa'; // Import the search icon
import '../index.css';



function SearchBox() {
    const [keyword, setKeyword] = useState('');

    const navigate = useNavigate();

    const submitHandler = (e) => {
        e.preventDefault();
        if (keyword) {
            navigate(`?keyword=${keyword}`);
        } else {
            navigate('/'); // Redirect to the home page or another default route if the search box is empty
        }
    };

    return (
        <Form onSubmit={submitHandler} className="d-flex align-items-center search-box">
  <div className="position-relative custom-search-input-group w-10">
    <FormControl
      type="search"
      placeholder="Search"
      className="custom-search-input form-control"
      aria-label="Search"
      onChange={(e) => setKeyword(e.target.value)}
      value={keyword}
    />
    <button type="submit" className="custom-search-button">
      <FaSearch />
    </button>
  </div>
</Form>

    );
}

export default SearchBox;
