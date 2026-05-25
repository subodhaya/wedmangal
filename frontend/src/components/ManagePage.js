import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import api from '../utils/api';
import { FaTimes } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './ManagePage.css';
import AvailabilityToggle from './AvailabilityToggle';



function ManagePage() {
    const [productData, setProductData] = useState({
        name: '',
        image: null,
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
        instagram_url: '',
        facebook_url: '',
        min_price: '',
        max_price: '',
        isApproved: false,
    });
    const [services, setServices] = useState([]);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [selectedServiceIndex, setSelectedServiceIndex] = useState(null);
    const [isSubmitDisabled, setIsSubmitDisabled] = useState(false);

    const navigate = useNavigate();
    const userInfo = (() => {
        try { return JSON.parse(localStorage.getItem('userInfo')); }
        catch { return null; }
    })();

    /* ── Fetch data ─────────────────────────────────────────── */
    const fetchData = async () => {
        try {
            const userId = userInfo.id;
            const { data } = await api.get(`/api/products/my-business/${userId}/`, {
                headers: { Authorization: `Bearer ${userInfo.token}` },
            });
            setProductData(data);
            setServices(data.services || []);
        } catch (error) {
            setErrorMessage(error.response?.data.message || 'Error fetching data');
        }
    };

    useEffect(() => { fetchData(); }, [userInfo.token]);

    /* ── Handle changes ─────────────────────────────────────── */
    const handleProductChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'image' && files.length > 0) {
            setProductData((prev) => ({
                ...prev,
                [name]: URL.createObjectURL(files[0]),
                imageFile: files[0],
            }));
        } else {
            setProductData((prev) => ({ ...prev, [name]: value }));
        }
    };

    /* ── Submit ─────────────────────────────────────────────── */
    const handleProductSubmit = async () => {
        setIsSubmitDisabled(true);
        try {
            const formData = new FormData();

            // Fields to skip entirely (not meant for the update endpoint)
            const skipKeys = ['imageFile', 'image', 'isApproved', 'is_approved', 'services', 'is_claimed', 'claimed_by_id'];

            for (const [key, value] of Object.entries(productData)) {
                if (skipKeys.includes(key)) continue;

                // ✅ Only append if value is not null/undefined/empty string
                // Send empty string for optional text fields, skip null/undefined
                if (value === null || value === undefined) {
                    formData.append(key, ''); // send empty string instead of "null"
                } else {
                    formData.append(key, value);
                }
            }

            // ✅ Only append image if a new file was selected
            if (productData.imageFile) {
                formData.append('image', productData.imageFile);
            }

            // ✅ Fallback: if personal_phone is empty, use business_phone
            if (!productData.personal_phone) {
                formData.set('personal_phone', productData.business_phone || '');
            }

            await api.post(`/api/products/update_product/${userInfo.id}/`, formData, {
                headers: { Authorization: `Bearer ${userInfo.token}` },
            });
            setSuccessMessage('Business updated successfully!');
            setErrorMessage('');
            navigate('/services');
        } catch (error) {
            const data = error.response?.data;
            const msg = data?.detail
                || data?.message
                || (typeof data === 'object' ? Object.values(data).flat().join(', ') : null)
                || error.message
                || 'Something went wrong. Please try again.';
            setErrorMessage(msg);
            setSuccessMessage('');
        } finally {
            setIsSubmitDisabled(false);
        }
    };

    /* ── Auto-clear messages ────────────────────────────────── */
    useEffect(() => {
        if (successMessage) {
            const t = setTimeout(() => setSuccessMessage(''), 4000);
            return () => clearTimeout(t);
        }
    }, [successMessage]);

    /* ── Approval badge ─────────────────────────────────────── */
    const ApprovalBadge = () => (
        <span className={`mp-badge ${productData.isApproved ? 'mp-badge-approved' : 'mp-badge-pending'}`}>
            {productData.isApproved ? '✅ Verified Business' : '⏳ Pending Approval'}
        </span>
    );

    return (
        <div className="manage-page">
            <AvailabilityToggle />
            <Container fluid style={{ padding: '0 16px' }}>

                {/* ── Floating alerts ──────────────────────────────── */}
                {successMessage && (
                    <div className="mp-alert mp-alert-success">✅ {successMessage}</div>
                )}
                {errorMessage && (
                    <div className="mp-alert mp-alert-danger">⚠️ {errorMessage}</div>
                )}

                {/* ── Welcome hero ─────────────────────────────────── */}
                <div className="mp-welcome-card">
                    <Row className="g-0">
                        <Col md={6}>
                            <div className="mp-welcome-left">
                                <div className="mp-welcome-top-row">
                                    <h2 className="mp-welcome-title">Manage Your Business</h2>
                                    <ApprovalBadge />
                                </div>
                                <p className="mp-welcome-subtitle">
                                    Keep your profile fresh — couples check your details before they reach out.
                                </p>
                                <p className="mp-welcome-text">
                                    Update your business name, photos, contact details, and working hours anytime. A complete profile gets 3× more enquiries.
                                </p>
                                <p className="mp-welcome-text">
                                    Changes go live after a quick review by our team — usually within a few hours.
                                </p>

                                {/* Quick stats */}
                                <div className="mp-stats-row">
                                    <div className="mp-stat">
                                        <span className="mp-stat-num">{services.length}</span>
                                        <span className="mp-stat-label">Services</span>
                                    </div>
                                    <div className="mp-stat-divider" />
                                    <div className="mp-stat">
                                        <span className="mp-stat-num">{productData.city || '—'}</span>
                                        <span className="mp-stat-label">City</span>
                                    </div>
                                    <div className="mp-stat-divider" />
                                    <div className="mp-stat">
                                        <span className="mp-stat-num">{productData.category || '—'}</span>
                                        <span className="mp-stat-label">Category</span>
                                    </div>
                                </div>
                            </div>
                        </Col>
                        <Col md={6} className="p-0">
                            <img
                                src="/images/makeupartist.jpg"
                                alt="Wedding Vendor"
                                className="mp-welcome-img"
                            />
                        </Col>
                    </Row>
                </div>

                {/* ── Form card ────────────────────────────────────── */}
                <div className="mp-form-card">
                    <div className="mp-form-header">
                        <h2 className="mp-form-title">✏️ Update Business Details</h2>
                        <p className="mp-form-subtitle">All fields are pre-filled from your current profile</p>
                    </div>

                    <div className="mp-form-body">
                        <form onSubmit={(e) => e.preventDefault()}>

                            {/* ── Business info ── */}
                            <div className="mp-section-divider">
                                <span className="mp-section-label">🏪 Business Info</span>
                                <div className="mp-section-line"></div>
                            </div>

                            <div className="mp-form-group">
                                <label className="mp-label">Business Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    className="mp-input"
                                    value={productData.name || ''}
                                    onChange={handleProductChange}
                                    placeholder="Enter business name"
                                    required
                                />
                            </div>

                            {/* Image with preview */}
                            <div className="mp-form-group">
                                <label className="mp-label">Business Image</label>
                                <div style={{ flex: 1 }}>
                                    <input
                                        type="file"
                                        name="image"
                                        className="mp-file-input"
                                        onChange={handleProductChange}
                                    />
                                    {productData.image && (
                                        <div className="mp-img-preview-wrap">
                                            <img
                                                src={productData.image}
                                                alt="Preview"
                                                className="mp-img-preview"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                            <button
                                                type="button"
                                                className="mp-img-remove-btn"
                                                onClick={() => setProductData((prev) => ({ ...prev, image: null }))}
                                                title="Remove image"
                                            >
                                                <FaTimes size={10} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mp-form-group">
                                <label className="mp-label">Brand</label>
                                <input
                                    type="text"
                                    name="brand"
                                    className="mp-input"
                                    value={productData.brand || ''}
                                    onChange={handleProductChange}
                                    placeholder="Enter brand name (optional)"
                                />
                            </div>

                            <div className="mp-form-group">
                                <label className="mp-label">Category</label>
                                <input
                                    type="text"
                                    name="category"
                                    className="mp-input"
                                    value={productData.category || ''}
                                    onChange={handleProductChange}
                                    placeholder="e.g. Makeup_Artist"
                                />
                            </div>

                            <div className="mp-form-group">
                                <label className="mp-label">Description</label>
                                <textarea
                                    name="description"
                                    className="mp-textarea"
                                    rows={3}
                                    value={productData.description || ''}
                                    onChange={handleProductChange}
                                    placeholder="Describe your business..."
                                />
                            </div>

                            {/* ── Location ── */}
                            <div className="mp-section-divider">
                                <span className="mp-section-label">📍 Location</span>
                                <div className="mp-section-line"></div>
                            </div>

                            <div className="mp-form-group">
                                <label className="mp-label">City</label>
                                <input
                                    type="text"
                                    name="city"
                                    className="mp-input"
                                    value={productData.city || ''}
                                    onChange={handleProductChange}
                                    placeholder="e.g. Chennai"
                                />
                            </div>

                            <div className="mp-form-group">
                                <label className="mp-label">Area</label>
                                <input
                                    type="text"
                                    name="area_name"
                                    className="mp-input"
                                    value={productData.area_name || ''}
                                    onChange={handleProductChange}
                                    placeholder="e.g. Anna Nagar, T. Nagar"
                                />
                            </div>

                            <div className="mp-form-group">
                                <label className="mp-label">Full Address</label>
                                <textarea
                                    name="address"
                                    className="mp-textarea"
                                    rows={2}
                                    value={productData.address || ''}
                                    onChange={handleProductChange}
                                    placeholder="Enter full address"
                                />
                            </div>

                            {/* ── Contact ── */}
                            <div className="mp-section-divider">
                                <span className="mp-section-label">📞 Contact</span>
                                <div className="mp-section-line"></div>
                            </div>

                            <div className="mp-form-group">
                                <label className="mp-label">Business Phone *</label>
                                <div style={{ flex: 1 }}>
                                    <input
                                        type="text"
                                        name="business_phone"
                                        className="mp-input"
                                        value={productData.business_phone || ''}
                                        onChange={handleProductChange}
                                        placeholder="10-digit mobile number"
                                    />
                                    <div className="mp-hint">Include country code if already saved (e.g. 919876543210)</div>
                                </div>
                            </div>

                            <div className="mp-form-group">
                                <label className="mp-label">Alt. Phone</label>
                                <input
                                    type="text"
                                    name="personal_phone"
                                    className="mp-input"
                                    value={productData.personal_phone || ''}
                                    onChange={handleProductChange}
                                    placeholder="Optional alternative number"
                                />
                            </div>

                            {/* ── Working hours ── */}
                            <div className="mp-section-divider">
                                <span className="mp-section-label">⏰ Working Hours</span>
                                <div className="mp-section-line"></div>
                            </div>

                            <div className="mp-time-row">
                                <div className="mp-time-group">
                                    <label className="mp-time-label">Opens at</label>
                                    <input
                                        type="time"
                                        name="opening_time"
                                        className="mp-time-input"
                                        value={productData.opening_time || ''}
                                        onChange={handleProductChange}
                                    />
                                </div>
                                <div className="mp-time-group">
                                    <label className="mp-time-label">Closes at</label>
                                    <input
                                        type="time"
                                        name="closing_time"
                                        className="mp-time-input"
                                        value={productData.closing_time || ''}
                                        onChange={handleProductChange}
                                    />
                                </div>
                            </div>

                            {/* ── Social Links ── */}
                            <div className="mp-section-divider">
                                <span className="mp-section-label">🔗 Social Links</span>
                                <div className="mp-section-line"></div>
                            </div>

                            <div className="mp-form-group">
                                <label className="mp-label">Instagram URL</label>
                                <input
                                    type="url"
                                    name="instagram_url"
                                    className="mp-input"
                                    value={productData.instagram_url || ''}
                                    onChange={handleProductChange}
                                    placeholder="https://instagram.com/yourbusiness"
                                />
                            </div>

                            <div className="mp-form-group">
                                <label className="mp-label">Facebook URL</label>
                                <input
                                    type="url"
                                    name="facebook_url"
                                    className="mp-input"
                                    value={productData.facebook_url || ''}
                                    onChange={handleProductChange}
                                    placeholder="https://facebook.com/yourbusiness"
                                />
                            </div>

                            {/* ── Price Range ── */}
                            <div className="mp-section-divider">
                                <span className="mp-section-label">💰 Price Range</span>
                                <div className="mp-section-line"></div>
                            </div>

                            <div className="mp-time-row">
                                <div className="mp-time-group">
                                    <label className="mp-time-label">Min Price (₹)</label>
                                    <input
                                        type="number"
                                        name="min_price"
                                        className="mp-time-input"
                                        value={productData.min_price || ''}
                                        onChange={handleProductChange}
                                        placeholder="e.g. 2000"
                                        min="0"
                                    />
                                </div>
                                <div className="mp-time-group">
                                    <label className="mp-time-label">Max Price (₹)</label>
                                    <input
                                        type="number"
                                        name="max_price"
                                        className="mp-time-input"
                                        value={productData.max_price || ''}
                                        onChange={handleProductChange}
                                        placeholder="e.g. 50000"
                                        min="0"
                                    />
                                </div>
                            </div>
                            <div className="mp-hint" style={{ marginTop: '-8px', marginBottom: '16px' }}>
                                Set your overall price range so clients can filter by budget.
                            </div>

                            {/* ── Submit ── */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                                <button
                                    type="button"
                                    className="mp-submit-btn"
                                    onClick={handleProductSubmit}
                                    disabled={isSubmitDisabled}
                                >
                                    {isSubmitDisabled ? '⏳ Saving...' : '💾 Save & Continue →'}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>

            </Container>
        </div>
    );
}

export default ManagePage;