import React, { useState, useRef } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './AddProductPage.css';

const AddProductPage = () => {
    const [userInfo, setUserInfo] = useState(() => {
        try { return JSON.parse(localStorage.getItem('userInfo')); }
        catch { return null; }
    });
    const navigate = useNavigate();

    const emptyProduct = {
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
        instagram_url: '',
        website_url: '',
        min_price: '',
        max_price: '',
    };

    const [productData, setProductData] = useState(emptyProduct);

    const [rawPhones, setRawPhones] = useState({ business_phone: '', personal_phone: '' });

    const [services, setServices] = useState([
        { name: '', description: '', price: '', countInStock: '', images: [] }
    ]);
    const [responseMessage, setResponseMessage] = useState('');
    const [isFormVisible, setIsFormVisible] = useState(true);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── Video files selected in-form (uploaded after product is created) ──
    const [pendingVideos, setPendingVideos]        = useState([]); // { file, preview }[]
    const [pendingVideoError, setPendingVideoError] = useState('');

    // ── Post-submit state ──
    const [step, setStep]                         = useState(null);
    const [createdProductId, setCreatedProductId] = useState(null);
    const [isSubmittingServices, setIsSubmittingServices] = useState(false);
    const [servicesError, setServicesError]       = useState('');

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

    const handlePendingVideoSelect = (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        setPendingVideoError('');
        if (pendingVideos.length >= 4) { setPendingVideoError('Maximum 4 videos allowed.'); return; }
        if (file.size > 100 * 1024 * 1024) { setPendingVideoError('File too large. Maximum 100 MB.'); return; }
        setPendingVideos(prev => [...prev, { file, name: file.name }]);
    };

    const removePendingVideo = (index) => {
        setPendingVideos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        const finalProductData = {
            ...productData,
            personal_phone: productData.personal_phone || productData.business_phone
        };

        const formData = new FormData();
        Object.keys(finalProductData).forEach(key => formData.append(key, finalProductData[key]));

        try {
            const response = await api.post('/api/products/register-product/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${userInfo.token}`,
                },
            });

            const productId = response.data.productId;

            // Upload any videos the user selected in the form
            for (const pv of pendingVideos) {
                try {
                    const vfd = new FormData();
                    vfd.append('video', pv.file);
                    await api.post(`/api/products/${productId}/upload-video/`, vfd, {
                        headers: { Authorization: `Bearer ${userInfo.token}` },
                    });
                } catch {
                    // non-blocking — video failures don't block registration
                }
            }

            setProductData(emptyProduct);
            setRawPhones({ business_phone: '', personal_phone: '' });
            setPendingVideos([]);
            setResponseMessage('Business registered successfully! Now add your services below.');
            setError('');
            setIsFormVisible(false);
            setCreatedProductId(productId);
            setStep('services');

        } catch (err) {
            const backendMsg = err.response?.data?.detail
                || err.response?.data?.message
                || err.response?.data?.error
                || Object.values(err.response?.data || {})[0]?.[0]
                || null;

            if (err.response?.status === 400 && backendMsg?.toLowerCase().includes('already')) {
                setError('You already have a registered business. Go to Manage My Page to edit or add services.');
            } else if (backendMsg) {
                setError(backendMsg);
            } else {
                setError('Something went wrong. Please check your details and try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleServicesSubmit = async (e) => {
        e.preventDefault();
        setIsSubmittingServices(true);
        setServicesError('');
        try {
            const toSubmit = services.filter(s => s.name || s.price);
            for (const service of toSubmit) {
                const fd = new FormData();
                fd.append('name', service.name || '');
                fd.append('description', service.description || '');
                fd.append('price', service.price || '0');
                fd.append('countInStock', 1);
                service.images.forEach((img, i) => fd.append(`images[${i}]`, img));
                await api.post('/api/products/add_service/', fd, {
                    headers: { Authorization: `Bearer ${userInfo.token}` },
                });
            }
            navigate('/manage-my-page');
        } catch (err) {
            setServicesError(err.response?.data?.detail || 'Failed to save services. Please try again.');
        } finally {
            setIsSubmittingServices(false);
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
                                    WedMangal is the only wedding-advertising solution that combines the power of App and realtime clients to bring you better leads and more bookings.
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

                        {error && (
                            <div className="ap-alert ap-alert-danger" style={{ marginBottom: '16px' }}>
                                ⚠️ {error}
                            </div>
                        )}

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
                                            value={rawPhones.business_phone}
                                            onChange={(e) =>
                                                setRawPhones(p => ({ ...p, business_phone: e.target.value }))
                                            }
                                            onBlur={(e) => {
                                                const normalized = normalizePhone(e.target.value);
                                                setRawPhones(p => ({ ...p, business_phone: normalized }));
                                                setProductData(p => ({ ...p, business_phone: normalized }));
                                            }}
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
                                            value={rawPhones.personal_phone}
                                            onChange={(e) =>
                                                setRawPhones(p => ({ ...p, personal_phone: e.target.value }))
                                            }
                                            onBlur={(e) => {
                                                const normalized = normalizePhone(e.target.value);
                                                setRawPhones(p => ({ ...p, personal_phone: normalized }));
                                                setProductData(p => ({ ...p, personal_phone: normalized }));
                                            }}
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
                                    <label className="ap-label">Website URL</label>
                                    <input
                                        type="url"
                                        name="website_url"
                                        className="ap-input"
                                        value={productData.website_url}
                                        onChange={handleProductChange}
                                        placeholder="https://yourbusiness.com"
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

                                {/* ── Promo Videos (in-form) ── */}
                                <div className="ap-section-divider">
                                    <span className="ap-section-label">🎬 Promo Videos</span>
                                    <div className="ap-section-line"></div>
                                </div>
                                <p style={{ fontSize: '12px', color: '#888', margin: '0 0 12px' }}>
                                    Up to 4 videos · MP4, MOV, AVI, MKV, WEBM · Max 100 MB each · Optional
                                </p>
                                {pendingVideoError && (
                                    <div className="ap-alert ap-alert-danger" style={{ marginBottom: '12px' }}>⚠️ {pendingVideoError}</div>
                                )}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
                                    {pendingVideos.map((pv, i) => (
                                        <div key={i} style={{ position: 'relative', border: '2px solid #5e143f', borderRadius: '8px', aspectRatio: '9/16', background: '#fdf0f6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px', overflow: 'hidden' }}>
                                            <span style={{ fontSize: '28px' }}>🎬</span>
                                            <span style={{ fontSize: '9px', color: '#5e143f', fontWeight: 600, textAlign: 'center', marginTop: '4px', wordBreak: 'break-all', lineHeight: 1.3 }}>{pv.name}</span>
                                            <button type="button" onClick={() => removePendingVideo(i)}
                                                style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '22px', height: '22px', color: '#fff', fontSize: '11px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                                        </div>
                                    ))}
                                    {pendingVideos.length < 4 && (
                                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #c9a96e', borderRadius: '8px', aspectRatio: '9/16', cursor: 'pointer', background: '#fdf8f0' }}>
                                            <span style={{ fontSize: '22px' }}>＋</span>
                                            <span style={{ fontSize: '10px', color: '#5e143f', fontWeight: 600, marginTop: '4px' }}>Add Video</span>
                                            <span style={{ fontSize: '9px', color: '#aaa', marginTop: '2px' }}>{pendingVideos.length + 1}/4</span>
                                            <input type="file" accept=".mp4,.mov,.avi,.mkv,.webm" style={{ display: 'none' }} onChange={handlePendingVideoSelect} />
                                        </label>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    className="ap-submit-btn"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? '⏳ Submitting...' : '🎊 Submit Business Registration'}
                                </button>

                            </form>
                        )}

                        {responseMessage && (
                            <div className="ap-alert ap-alert-success" style={{ marginBottom: '20px' }}>
                                ✅ {responseMessage}
                            </div>
                        )}
                        {error && (
                            <div className="ap-alert ap-alert-danger">
                                ⚠️ {error}
                            </div>
                        )}

                        {/* ── Step 2: Services ── */}
                        {step === 'services' && (
                            <form onSubmit={handleServicesSubmit}>
                                <div className="ap-services-heading">
                                    ✨ Your Services
                                </div>
                                <p className="ap-services-hint">
                                    Add the services you offer. You can add more services later from Manage My Page.
                                </p>

                                {servicesError && (
                                    <div className="ap-alert ap-alert-danger" style={{ marginBottom: '12px' }}>⚠️ {servicesError}</div>
                                )}

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

                                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                    <button
                                        type="button"
                                        className="ap-add-service-btn"
                                        onClick={() => navigate('/manage-my-page')}
                                    >
                                        Skip → Go to Dashboard
                                    </button>
                                    <button
                                        type="submit"
                                        className="ap-submit-btn"
                                        disabled={isSubmittingServices}
                                    >
                                        {isSubmittingServices ? '⏳ Saving...' : '✅ Save Services & Go to Dashboard'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

            </Container>
        </div>
    );
};

export default AddProductPage;