import React, { useState, useEffect } from 'react';
import { LinkContainer } from 'react-router-bootstrap';
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SearchBox from './SearchBox';
import './Header.css';

const getUserInfo = () => {
  try {
    return JSON.parse(localStorage.getItem('userInfo'));
  } catch {
    return null;
  }
};

const clearUserInfo = () => {
  localStorage.removeItem('userInfo');
  // localStorage.removeItem('cartItems');
  // localStorage.removeItem('wishlists');
};

const Header = () => {
  const userInfo = getUserInfo();
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);

  // Helper to produce a 'to' value that redirects to login when not authenticated.
  // It returns either a string path or an object { pathname, search } (safe for react-router).
  const redirectToLogin = (targetPath) => {
    if (userInfo) return targetPath;
    return { pathname: '/login', search: `?redirect=${encodeURIComponent(targetPath)}` };
  };

  const logoutHandler = async () => {
    try {
      if (userInfo) {
        const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
        const wishlistItems = JSON.parse(localStorage.getItem('wishlists')) || [];

        // Synchronize cart and wishlist data on logout
        await axios.post(
          '/api/products/cart/',
          { items: cartItems, userId: userInfo._id },
          { headers: { Authorization: `Bearer ${userInfo.token}` } }
        );
        await axios.post(
          '/api/products/wishlist/',
          { items: wishlistItems, user: userInfo._id },
          { headers: { Authorization: `Bearer ${userInfo.token}` } }
        );
      }
    } catch (error) {
      console.error('Error syncing data on logout:', error.message);
      // continue with logout even if sync fails
    } finally {
      clearUserInfo();
      navigate('/login');
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

  useEffect(() => {
    const fetchNotifications = async () => {
      if (userInfo && userInfo.role === 'service-owner') {
        try {
          const { data } = await axios.get('/api/orders/unread/', {
            headers: { Authorization: `Bearer ${userInfo.token}` },
          });
          setNotificationCount(data.count || 0);
        } catch (error) {
          console.error('Failed to fetch notifications', error);
        }
      } else {
        setNotificationCount(0);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // check every minute
    return () => clearInterval(interval);
  }, [userInfo]);

  return (
    <div>
      {successMessage && <div className="alert alert-success">{successMessage}</div>}
      {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}
      <header>
        <Navbar className="header-navbar" expand="lg">
          <Container>
            <LinkContainer to="/">
              <Navbar.Brand className="brand-logo">
                <img
                  src="/images/android-chrome-192x192.png"
                  alt="Logo"
                  className="logo"
                  style={{ width: '50px', height: '50px', marginRight: '10px' }}
                />
                <span className="brand-text">BOOKYOURCELEBRATION</span>
              </Navbar.Brand>
            </LinkContainer>

            <Navbar.Toggle aria-controls="basic-navbar-nav" className="custom-toggler" />
            <Navbar.Collapse id="basic-navbar-nav">
              {/* Left side - common links visible to everyone */}
              <Nav className="me-auto align-items-center">
                <LinkContainer to="/">
                  <Nav.Link>
                    <i className="fas fa-home" aria-hidden="true"></i> Home
                  </Nav.Link>
                </LinkContainer>

                <LinkContainer to="/budget">
                  <Nav.Link>
                    <i className="fas fa-chart-pie" aria-hidden="true"></i> Budget
                  </Nav.Link>
                </LinkContainer>

                {/* Search box is common */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <SearchBox />
                </div>

                {/* Wishlist & Cart - if user not logged in, redirectToLogin returns {pathname:'/login', search:'?redirect=...'} */}
                <LinkContainer to={redirectToLogin('/wishlist')}>
                  <Nav.Link>
                    <i className="fas fa-heart" aria-hidden="true"></i> Wishlist
                  </Nav.Link>
                </LinkContainer>

                <LinkContainer to={redirectToLogin('/cart')}>
                  <Nav.Link>
                    <i className="fas fa-shopping-cart" aria-hidden="true"></i> Cart
                  </Nav.Link>
                </LinkContainer>
              </Nav>

              {/* Right side - role-specific and auth */}
              <Nav className="ms-auto align-items-center">
                {/* Service-owner extra menu */}
                {userInfo?.role === 'service-owner' && (
                  <>
                    <NavDropdown title="Owner Menu" id="owner-nav-dropdown" align="end">
                      <LinkContainer to="/orderlist/">
                        <NavDropdown.Item>Booking List</NavDropdown.Item>
                      </LinkContainer>
                      <LinkContainer to="/services/my-services">
                        <NavDropdown.Item>My Services</NavDropdown.Item>
                      </LinkContainer>
                    </NavDropdown>

                    <div
                      className="notification-container"
                      style={{ marginLeft: '10px', marginRight: '10px' }}
                      aria-live="polite"
                    >
                      <i className="fas fa-bell" aria-hidden="true"></i>
                      {notificationCount > 0 && (
                        <span className="notification-badge">{notificationCount}</span>
                      )}
                    </div>
                  </>
                )}

                {/* Admin menu */}
                {userInfo?.isAdmin && (
                  <NavDropdown title="Admin Menu" id="admin-nav-dropdown" align="end">
                    <LinkContainer to="/admin/productlist">
                      <NavDropdown.Item>Services List</NavDropdown.Item>
                    </LinkContainer>
                    <LinkContainer to="/admin/userlist">
                      <NavDropdown.Item>User List</NavDropdown.Item>
                    </LinkContainer>
                    <NavDropdown.Divider />
                    <LinkContainer to="/admin/orderlist">
                      <NavDropdown.Item>Booking List</NavDropdown.Item>
                    </LinkContainer>
                  </NavDropdown>
                )}

                {/* Auth / Profile */}
                {userInfo ? (
                  <NavDropdown
                    title={<><i className="fas fa-user" aria-hidden="true"></i> {userInfo.name}</>}
                    id="username"
                    align="end"
                  >
                    <LinkContainer to="/profile">
                      <NavDropdown.Item>Profile / Bookings</NavDropdown.Item>
                    </LinkContainer>
                    <NavDropdown.Item onClick={logoutHandler}>Logout</NavDropdown.Item>
                  </NavDropdown>
                ) : (
                  <LinkContainer to="/login">
                    <Nav.Link>Login</Nav.Link>
                  </LinkContainer>
                )}
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>
      </header>
    </div>
  );
};

export default Header;
