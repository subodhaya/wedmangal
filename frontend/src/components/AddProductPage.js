import React, { useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import './AddProductPage.css';

const AddProductPage = () => {
    const [userInfo, setUserInfo] = useState(JSON.parse(localStorage.getItem('userInfo')));
    const [productData, setProductData] = useState({
        name: '',
        image: '',
        brand: '',
        category: '',
        description: '',
        city: '',
        area_name: '',
        address: '',
        business_phone: '',
        personal_phone: '',
        opening_time: '',
        closing_time: '',
        instagram_url: '',   // NEW
        facebook_url: '',    // NEW
        min_price: '',       // NEW
        max_price: '',       // NEW
    });

    const [services, setServices] = useState([
        { name: '', description: '', price: '', countInStock: '', images: [] }
    ]);

    const [isFormVisible, setIsFormVisible] = useState(true);
    const [responseMessage, setResponseMessage] = useState('');
    const [error, setError] = useState('');

    const handleProductChange = (e) => {
        const { name, value, files } = e.target;
        setProductData({ ...productData, [name]: files ? files[0] : value });
    };

    const normalizePhone = (value) => {
        if (!value) return '';
        let cleaned = value.replace(/\D/g, '');
        if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
        if (cleaned.length === 10) cleaned = '91' + cleaned;
        return cleaned;
    };

    const handleServiceChange = (index, e) => {
        const { name, value } = e.target;
        const updatedServices = [...services];
        updatedServices[index][name] = value;
        setServices(updatedServices);
    };

    const handleImageChange = (index, e) => {
        const files = Array.from(e.target.files);
        const updatedServices = [...services];
        updatedServices[index].images = files;
        setServices(updatedServices);
    };

    const handleAddService = () => {
        setServices([...services, { name: '', description: '', price: '', countInStock: '', images: [] }]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const finalProductData = {
            ...productData,
            personal_phone: productData.personal_phone || productData.business_phone
        };

        const formData = new FormData();
        Object.keys(finalProductData).forEach(key => formData.append(key, finalProductData[key]));

        services.forEach((service, index) => {

    // ✅ skip empty service
    if (!service.name && !service.price) return;

    formData.append(`services[${index}][name]`, service.name || '');
    formData.append(`services[${index}][description]`, service.description || '');

    // ✅ FIX: don't send empty price
    if (service.price) {
        formData.append(`services[${index}][price]`, service.price);
    }

    formData.append(`services[${index}][countInStock]`, 1);
            service.images.forEach((image, imgIndex) => {
                formData.append(`services[${index}][images][${imgIndex}]`, image);
            });
        });

        try {
            const response = await api.post('/api/products/register-product/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${userInfo.token}`,
                },
            });

            // ✅ Success — axios throws on 4xx/5xx so reaching here = success
            console.log('✅ Register success:', response.data);

            setProductData({
                name: '', image: '', brand: '', category: '', description: '',
                city: '', area_name: '', address: '', business_phone: '',
                personal_phone: '', opening_time: '', closing_time: '',
            });
            setServices([{ name: '', description: '', price: '', countInStock: '', images: [] }]);
            setResponseMessage('Business registered successfully! Our team will review and approve your listing shortly.');
            setError('');

        } catch (err) {
            // 🔍 Log the real error so we can debug
            console.error('❌ Register error:', err);
            console.error('❌ Response data:', err.response?.data);
            console.error('❌ Status:', err.response?.status);

            // Show the actual backend error message if available
            const backendMsg = err.response?.data?.detail
                || err.response?.data?.message
                || err.response?.data?.error
                || Object.values(err.response?.data || {})[0]?.[0]  // Django field error
                || null;

            if (err.response?.status === 400 && backendMsg?.toLowerCase().includes('already')) {
                // Likely "already registered" error
                setError('You already have a registered business. Go to Manage My Page to edit or add services.');
            } else if (backendMsg) {
                setError(backendMsg);
            } else {
                setError('Something went wrong. Please check your details and try again.');
            }
            setResponseMessage('');
        }
    };

    return (
        <div className="add-product-page">
            <Container fluid style={{ padding: '0 16px' }}>

                {/* ── Welcome hero ────────────────────────────────── */}
                <div className="ap-welcome-card">
                    <Row className="g-0">
                        <Col md={6}>
                            <div className="ap-welcome-left">
                                <h2 className="ap-welcome-title">
                                    Welcome to Your Business Dashboard
                                </h2>
                                <p className="ap-welcome-subtitle">
                                    Grow your wedding business in a way that's easy and empowering — with the most trusted brand in the industry behind you.
                                </p>
                                <p className="ap-welcome-text">
                                    BookYourCelebrations is the only wedding-advertising solution that combines the power of App and realtime clients to bring you better leads and more bookings.
                                </p>
                                <p className="ap-welcome-text">
                                    Customize your business card beautifully here. First impressions matter — make the best one and build trust while showing off your work, background, and passion.
                                </p>
                                <p className="ap-welcome-text">
                                    If you have already saved your business details, click here to edit or add more services.
                                </p>
                                <Link to="/manage-my-page" className="ap-manage-btn">
                                    ✏️ Manage My Page
                                </Link>
                            </div>
                        </Col>
                        <Col md={6} className="p-0">
                            <img
                                src="/images/makeupartist.jpg"
                                alt="Wedding Vendor"
                                className="ap-welcome-img"
                            />
                        </Col>
                    </Row>
                </div>

                {/* ── Form section ────────────────────────────────── */}
                <div className="ap-form-section">
                    <div className="ap-form-header">
                        <h2 className="ap-form-title">🎊 Register Your Business</h2>
                        <p className="ap-form-subtitle">
                            A streamlined dashboard to help you showcase your services and connect with clients
                        </p>
                    </div>

                    <div className="ap-form-body">
                        {isFormVisible && (
                            <form onSubmit={handleSubmit}>

                                {/* ── Business details section ── */}
                                <div className="ap-section-divider">
                                    <span className="ap-section-label">🏪 Business Details</span>
                                    <div className="ap-section-line"></div>
                                </div>

                                <div className="ap-form-group">
                                    <label className="ap-label">Business Name *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        className="ap-input"
                                        value={productData.name}
                                        onChange={handleProductChange}
                                        placeholder="e.g. Priya Bridal Studio"
                                        required
                                    />
                                </div>

                                <div className="ap-form-group">
                                    <label className="ap-label">Business Image</label>
                                    <input
                                        type="file"
                                        name="image"
                                        className="ap-file-input"
                                        onChange={handleProductChange}
                                    />
                                </div>

                                <div className="ap-form-group">
                                    <label className="ap-label">Brand</label>
                                    <input
                                        type="text"
                                        name="brand"
                                        className="ap-input"
                                        value={productData.brand}
                                        onChange={handleProductChange}
                                        placeholder="Enter brand name"
                                    />
                                </div>

                                <div className="ap-form-group">
                                    <label className="ap-label">Category *</label>
                                    <div className="ap-select-wrap">
                                        <select
                                            name="category"
                                            className="ap-select"
                                            value={productData.category}
                                            onChange={handleProductChange}
                                            required
                                        >
                                            <option value="" disabled>Select a category</option>
                                            <option value="Makeup_Artist">Makeup Artist</option>
                                            <option value="Photographers">Photographers</option>
                                            <option value="Caterers">Caterers</option>
                                            <option value="Planners">Planners</option>
                                            <option value="Halls">Halls</option>
                                            <option value="Decorators">Decorators</option>
                                            <option value="Mehandi_Artist">Mehandi Artist</option>
                                            <option value="Invitation">Invitation</option>
                                            <option value="Jewellery">Jewellery</option>
                                            <option value="DJ_Artist">DJ Artist</option>
                                            <option value="Travel_Transport">Travel and Transport</option>
                                            <option value="Entertainment">Entertainment</option>
                                            <option value="Pandit">Pandit</option>
                                        </select>
                                        <i className="fa fa-caret-down ap-select-arrow"></i>
                                    </div>
                                </div>

                                <div className="ap-form-group">
                                    <label className="ap-label">Description</label>
                                    <textarea
                                        name="description"
                                        className="ap-textarea"
                                        rows={3}
                                        value={productData.description}
                                        onChange={handleProductChange}
                                        placeholder="Describe your business and what makes you special..."
                                    />
                                </div>

                                {/* ── Location section ── */}
                                <div className="ap-section-divider">
                                    <span className="ap-section-label">📍 Location</span>
                                    <div className="ap-section-line"></div>
                                </div>

                                <div className="ap-form-group">
                                    <label className="ap-label">City</label>
                                    <input
                                        type="text"
                                        name="city"
                                        className="ap-input"
                                        value={productData.city}
                                        onChange={handleProductChange}
                                        placeholder="e.g. Chennai"
                                    />
                                </div>

                                <div className="ap-form-group">
                                    <label className="ap-label">Area</label>
                                    <input
                                        type="text"
                                        name="area_name"
                                        className="ap-input"
                                        value={productData.area_name}
                                        onChange={handleProductChange}
                                        placeholder="e.g. Anna Nagar, T. Nagar"
                                    />
                                </div>

                                <div className="ap-form-group">
                                    <label className="ap-label">Full Address</label>
                                    <textarea
                                        name="address"
                                        className="ap-textarea"
                                        rows={2}
                                        value={productData.address}
                                        onChange={handleProductChange}
                                        placeholder="Enter your full shop/studio address"
                                    />
                                </div>

                                {/* ── Contact section ── */}
                                <div className="ap-section-divider">
                                    <span className="ap-section-label">📞 Contact</span>
                                    <div className="ap-section-line"></div>
                                </div>

                                <div className="ap-form-group">
                                    <label className="ap-label">Business Phone *</label>
                                    <div style={{ flex: 1 }}>
                                        <input
                                            type="tel"
                                            name="business_phone"
                                            className="ap-input"
                                            value={productData.business_phone}
                                            onChange={(e) => setProductData({
                                                ...productData,
                                                business_phone: normalizePhone(e.target.value),
                                            })}
                                            placeholder="e.g. 9876543210"
                                        />
                                        <div className="ap-hint">Enter 10-digit number. Country code +91 added automatically.</div>
                                    </div>
                                </div>

                                <div className="ap-form-group">
                                    <label className="ap-label">Alt. Phone</label>
                                    <div style={{ flex: 1 }}>
                                        <input
                                            type="tel"
                                            name="personal_phone"
                                            className="ap-input"
                                            value={productData.personal_phone}
                                            onChange={(e) => setProductData({
                                                ...productData,
                                                personal_phone: normalizePhone(e.target.value),
                                            })}
                                            placeholder="Optional alternative number"
                                        />
                                        <div className="ap-hint">Leave blank to use business phone.</div>
                                    </div>
                                </div>

                                {/* ── Timing section ── */}
                                <div className="ap-section-divider">
                                    <span className="ap-section-label">⏰ Working Hours</span>
                                    <div className="ap-section-line"></div>
                                </div>

                                <div className="ap-time-row">
                                    <div className="ap-time-group">
                                        <label className="ap-time-label">Opens at</label>
                                        <input
                                            type="time"
                                            name="opening_time"
                                            className="ap-time-input"
                                            value={productData.opening_time}
                                            onChange={handleProductChange}
                                        />
                                    </div>
                                    <div className="ap-time-group">
                                        <label className="ap-time-label">Closes at</label>
                                        <input
                                            type="time"
                                            name="closing_time"
                                            className="ap-time-input"
                                            value={productData.closing_time}
                                            onChange={handleProductChange}
                                        />
                                    </div>
                                </div>
                                {/* ── Social Links section ── */}
<div className="ap-section-divider">
    <span className="ap-section-label">🔗 Social Links</span>
    <div className="ap-section-line"></div>
</div>

<div className="ap-form-group">
    <label className="ap-label">Instagram URL</label>
    <input
        type="url"
        name="instagram_url"
        className="ap-input"
        value={productData.instagram_url}
        onChange={handleProductChange}
        placeholder="https://instagram.com/yourbusiness"
    />
</div>

<div className="ap-form-group">
    <label className="ap-label">Facebook URL</label>
    <input
        type="url"
        name="facebook_url"
        className="ap-input"
        value={productData.facebook_url}
        onChange={handleProductChange}
        placeholder="https://facebook.com/yourbusiness"
    />
</div>
{/* ── Price Range section ── */}
<div className="ap-section-divider">
    <span className="ap-section-label">💰 Price Range</span>
    <div className="ap-section-line"></div>
</div>

<div className="ap-time-row">
    <div className="ap-time-group">
        <label className="ap-time-label">Min Price (₹)</label>
        <input
            type="number"
            name="min_price"
            className="ap-time-input"
            value={productData.min_price}
            onChange={handleProductChange}
            placeholder="e.g. 2000"
            min="0"
        />
    </div>
    <div className="ap-time-group">
        <label className="ap-time-label">Max Price (₹)</label>
        <input
            type="number"
            name="max_price"
            className="ap-time-input"
            value={productData.max_price}
            onChange={handleProductChange}
            placeholder="e.g. 50000"
            min="0"
        />
    </div>
</div>
<div className="ap-hint" style={{ marginTop: '-8px', marginBottom: '16px' }}>
    Set your overall price range so clients can filter by budget.
</div>
                                {/* ── Services section ── */}
                                <div className="ap-services-heading">
                                    ✨ Your Services
                                </div>
                                <p className="ap-services-hint">
                                    Add the services you offer. You can add more services later from Manage My Page.
                                </p>

                                {services.map((service, index) => (
                                    <div key={index} className="ap-service-card">
                                        <div className="ap-service-card-header">
                                            <div className="ap-service-number">{index + 1}</div>
                                            <h4 className="ap-service-title">
                                                {service.name || `Service ${index + 1}`}
                                            </h4>
                                        </div>

                                        <div className="ap-form-group">
                                            <label className="ap-label">Service Name</label>
                                            <input
                                                type="text"
                                                name="name"
                                                className="ap-input"
                                                value={service.name}
                                                onChange={(e) => handleServiceChange(index, e)}
                                                placeholder="e.g. Bridal Makeup, Full Day Photography"
                                            />
                                        </div>

                                        <div className="ap-form-group">
                                            <label className="ap-label">Description</label>
                                            <textarea
                                                name="description"
                                                className="ap-textarea"
                                                rows={3}
                                                value={service.description}
                                                onChange={(e) => handleServiceChange(index, e)}
                                                placeholder="What's included in this service?"
                                            />
                                        </div>

                                        <div className="ap-form-group">
                                            <label className="ap-label">Price (₹)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                name="price"
                                                className="ap-input"
                                                value={service.price}
                                                onChange={(e) => handleServiceChange(index, e)}
                                                placeholder="e.g. 5000"
                                                style={{ maxWidth: '200px' }}
                                            />
                                        </div>

                                        {/* countInStock hidden — same as original */}
                                        <input type="hidden" name="countInStock" value={service.countInStock || 5} />

                                        <div className="ap-form-group">
                                            <label className="ap-label">Service Images</label>
                                            <input
                                                type="file"
                                                multiple
                                                name="images"
                                                className="ap-file-input"
                                                onChange={(e) => handleImageChange(index, e)}
                                            />
                                        </div>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    className="ap-add-service-btn"
                                    onClick={handleAddService}
                                >
                                    + Add Another Service
                                </button>

                                <button type="submit" className="ap-submit-btn">
                                    🎊 Submit Business Registration
                                </button>
                            </form>
                        )}

                        {responseMessage && (
                            <div className="ap-alert ap-alert-success">
                                ✅ {responseMessage}
                            </div>
                        )}
                        {error && (
                            <div className="ap-alert ap-alert-danger">
                                ⚠️ {error}
                            </div>
                        )}
                    </div>
                </div>

            </Container>
        </div>
    );
};

export default AddProductPage;