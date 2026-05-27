import React, { useState, useEffect, useRef } from 'react';
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
        website_url: '',
        min_price: '',
        max_price: '',
        isApproved: false,
    });
    const [services, setServices] = useState([]);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [selectedServiceIndex, setSelectedServiceIndex] = useState(null);
    const [isSubmitDisabled, setIsSubmitDisabled] = useState(false);

    // ── Video state ─────────────────────────────────────────
    const [videos, setVideos]               = useState([]);
    const [uploadingCount, setUploadingCount] = useState(0);
    const uploadingRef                      = useRef(0);   // sync ref — never stale in concurrent handlers
    const [videoError, setVideoError]       = useState('');

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
            setVideos(data.videos || []);
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

    /* ── Video handlers ─────────────────────────────────────── */
    const handleVideoSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setVideoError('');
        // Use ref for the check — state is stale when multiple files are picked simultaneously
        if (videos.length + uploadingRef.current >= 4) { setVideoError('Maximum 4 videos allowed.'); return; }
        if (file.size > 100 * 1024 * 1024) { setVideoError('File too large. Maximum allowed is 100 MB.'); return; }
        const productId = productData._id;
        if (!productId) { setVideoError('Save your business details first.'); return; }
        uploadingRef.current += 1;
        setUploadingCount(uploadingRef.current);
        try {
            const formData = new FormData();
            formData.append('video', file);
            const res = await api.post(`/api/products/${productId}/upload-video/`, formData, {
                headers: { Authorization: `Bearer ${userInfo.token}` },
            });
            setVideos(prev => [...prev, {
                _id: res.data.id,
                video_url: res.data.video_url,
                video_thumb: res.data.thumb_url,
                video_duration: res.data.duration,
            }]);
        } catch (err) {
            setVideoError(err.response?.data?.error || 'Upload failed. Please try again.');
        } finally {
            uploadingRef.current -= 1;
            setUploadingCount(uploadingRef.current);
            e.target.value = '';
        }
    };

    const handleVideoDelete = async (videoId) => {
        const productId = productData._id;
        if (!productId) return;
        try {
            await api.delete(`/api/products/${productId}/videos/${videoId}/`, {
                headers: { Authorization: `Bearer ${userInfo.token}` },
            });
            setVideos(prev => prev.filter(v => v._id !== videoId));
        } catch {
            setVideoError('Could not remove video. Please try again.');
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
                                <label className="mp-label">Website URL</label>
                                <input
                                    type="url"
                                    name="website_url"
                                    className="mp-input"
                                    value={productData.website_url || ''}
                                    onChange={handleProductChange}
                                    placeholder="https://yourbusiness.com"
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

                            {/* ── Video Upload ── */}
                            <div className="mp-section-divider">
                                <span className="mp-section-label">🎬 Promo Videos</span>
                                <div className="mp-section-line"></div>
                            </div>

                            {videoError && (
                                <div className="mp-alert mp-alert-danger" style={{ marginBottom: '12px' }}>⚠️ {videoError}</div>
                            )}

                            <p style={{ fontSize: '12px', color: '#888', margin: '0 0 12px' }}>
                                Up to 4 videos · MP4, MOV, AVI, MKV, WEBM · Max 100 MB each
                            </p>

                            {/* 4-slot grid */}
                            {(() => {
                                const emptySlots = Math.max(0, 4 - videos.length - uploadingCount);
                                return (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
                                        {/* Filled slots */}
                                        {videos.map((vid) => (
                                            <div key={vid._id} style={{ position: 'relative' }}>
                                                <img src={vid.video_thumb} alt="thumb"
                                                    style={{ width: '100%', aspectRatio: '9/16', objectFit: 'cover', borderRadius: '8px', border: '2px solid #5e143f', display: 'block' }} />
                                                {vid.video_duration && (
                                                    <span style={{ position: 'absolute', bottom: '6px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '10px', padding: '2px 5px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                                        {Math.floor(vid.video_duration)}s
                                                    </span>
                                                )}
                                                <button type="button" onClick={() => handleVideoDelete(vid._id)}
                                                    style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', color: '#fff', fontSize: '12px', cursor: 'pointer', lineHeight: 1 }}
                                                    title="Remove video">✕</button>
                                            </div>
                                        ))}

                                        {/* Uploading slots — one spinner per in-flight upload */}
                                        {Array.from({ length: uploadingCount }).map((_, i) => (
                                            <div key={`uploading-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #c9a96e', borderRadius: '8px', aspectRatio: '9/16', background: '#fdf8f0', padding: '12px', gap: '6px' }}>
                                                <span style={{ fontSize: '22px' }}>🎬</span>
                                                <span style={{ fontSize: '11px', color: '#5e143f', fontWeight: 700, textAlign: 'center' }}>Processing video…</span>
                                                <span style={{ fontSize: '10px', color: '#888', textAlign: 'center', lineHeight: 1.4 }}>This can take up to a minute. Please don't close this page.</span>
                                            </div>
                                        ))}

                                        {/* Empty upload slots — all remaining shown at once */}
                                        {Array.from({ length: emptySlots }).map((_, i) => (
                                            <label key={`empty-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #c9a96e', borderRadius: '8px', aspectRatio: '9/16', cursor: 'pointer', background: '#fdf8f0' }}>
                                                <span style={{ fontSize: '22px' }}>＋</span>
                                                <span style={{ fontSize: '10px', color: '#5e143f', fontWeight: 600, marginTop: '4px' }}>Add Video</span>
                                                <span style={{ fontSize: '9px', color: '#aaa', marginTop: '2px' }}>{videos.length + uploadingCount + i + 1}/4</span>
                                                <input type="file" accept=".mp4,.mov,.avi,.mkv,.webm" style={{ display: 'none' }} onChange={handleVideoSelect} />
                                            </label>
                                        ))}
                                    </div>
                                );
                            })()}

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