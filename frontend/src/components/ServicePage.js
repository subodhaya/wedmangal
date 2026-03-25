import { useState, useEffect ,useRef} from 'react';
import { FaTrash, FaTimes, FaPlus } from 'react-icons/fa';
import api from '../utils/api';
import { useNavigate, useParams } from 'react-router-dom';
import './ServicePage.css';

/* ── ImageThumb: safely renders one image with delete button ─
   Uses React state to handle broken images gracefully         */
const ImageThumb = ({ imageUrl, imgIndex, onDelete }) => {
    const [broken, setBroken] = useState(false);
    return (
        <div className="sp-image-thumb">
            {broken ? (
                <div className="sp-image-thumb-placeholder">🖼️</div>
            ) : (
                <img
                    src={imageUrl}
                    alt={`service ${imgIndex + 1}`}
                    onError={() => setBroken(true)}
                />
            )}
            <button
                type="button"
                className="sp-image-thumb-remove"
                onClick={onDelete}
                title="Remove image"
            >
                <FaTimes size={9} />
            </button>
        </div>
    );
};



const ServicePage = () => {
    const [services, setServices] = useState([]);
    const [selectedServiceIndex, setSelectedServiceIndex] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitDisabled, setIsSubmitDisabled] = useState(false);
    const [productData, setProductData] = useState({});
    const [newService, setNewService] = useState({
        name: '',
        description: '',
        price: '',
        countInStock: '',
        images: [],
    });

    const { productId } = useParams();
    const navigate = useNavigate();
       const alertRef = useRef(null);

useEffect(() => {
  if ((successMessage || errorMessage) && alertRef.current) {
    alertRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}, [successMessage, errorMessage]);
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));

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

    useEffect(() => {
        if (userInfo?.token) fetchData();
    }, [userInfo?.token]);

    /* ── BUG FIX: localStorage restore moved into useEffect ── */
    useEffect(() => {
        const storedIndex = localStorage.getItem('selectedServiceIndex');
        if (storedIndex !== null && services.length > 0) {
            const index = parseInt(storedIndex, 10);
            if (!isNaN(index) && index >= 0 && index < services.length) {
                handleServiceClick(index);
            }
            localStorage.removeItem('selectedServiceIndex');
        }
    }, [services]);

    /* ── Auto-clear messages ────────────────────────────────── */
    useEffect(() => {
        if (successMessage || errorMessage) {
            const t = setTimeout(() => { setSuccessMessage(''); setErrorMessage(''); }, 4000);
            return () => clearTimeout(t);
        }
    }, [successMessage, errorMessage]);

    /* ── Click service to edit ──────────────────────────────── */
    const handleServiceClick = (index) => {
        const selectedService = services[index];
        // 🔍 Debug: log image format so we can verify
        console.log('Service images format:', selectedService.images);
        setSelectedServiceIndex(index);
        setNewService({
            ...selectedService,
            images: selectedService.images || [],
        });
    };

    /* ── Reset to "add new" mode ────────────────────────────── */
    const handleResetForm = () => {
        setSelectedServiceIndex(null);
        setNewService({ name: '', description: '', price: '', countInStock: '', images: [] });
    };

    /* ── resolveImageUrl: handles every format the API might return ──────
       Django typically returns:
         { image: "images/filename.jpg" }   ← no leading slash!
         { image: "/images/filename.jpg" }  ← with leading slash
         or plain strings
    ─────────────────────────────────────────────────────────────────── */
    const resolveImageUrl = (imgObj) => {
        if (!imgObj) return null;

        // Case: fresh local upload with blob preview
        if (typeof imgObj === 'object' && imgObj.preview) {
            return imgObj.preview;
        }

        // Case: server object with .image field
        if (typeof imgObj === 'object' && imgObj.image) {
            const url = imgObj.image;
            if (url.startsWith('http')) return url;
            if (url.startsWith('/')) return url;
            // Django often returns "images/filename.jpg" without leading slash
            return `/${url}`;
        }

        // Case: plain string
        if (typeof imgObj === 'string') {
            if (imgObj.startsWith('blob:')) return imgObj;
            if (imgObj.startsWith('http')) return imgObj;
            if (imgObj.startsWith('/')) return imgObj;
            return `/${imgObj}`;
        }

        return null;
    };

    const renderImages = (images = []) => {
        return images.map((imgObj, imgIndex) => {
            const imageUrl = resolveImageUrl(imgObj);
            if (!imageUrl) return null;
            return (
                <ImageThumb
                    key={imgIndex}
                    imageUrl={imageUrl}
                    imgIndex={imgIndex}
                    onDelete={() => handleDeleteServiceImage(selectedServiceIndex, imgIndex)}
                />
            );
        });
    };

    /* ── Field change ───────────────────────────────────────── */
    const handleServiceChange = (e) => {
        const { name, value } = e.target;
        setNewService({ ...newService, [name]: value });
    };

    /* ── Delete image ───────────────────────────────────────── */
    const handleDeleteServiceImage = async (serviceIndex, imgIndex) => {
        const updatedServices = [...services];
        const deletedImage = updatedServices[serviceIndex].images[imgIndex];
        updatedServices[serviceIndex].images.splice(imgIndex, 1);
        setServices(updatedServices);

        // Also remove from the form state
        const updatedImages = [...newService.images];
        updatedImages.splice(imgIndex, 1);
        setNewService({ ...newService, images: updatedImages });

        try {
            await api.put(
                `/api/products/${services[serviceIndex]._id}/remove-service-image/`,
                { image: deletedImage },
                { headers: { Authorization: `Bearer ${userInfo.token}` } }
            );
        } catch (error) {
            setErrorMessage(error.response?.data.message || 'Error deleting image');
        }
    };

    /* ── Delete service ─────────────────────────────────────── */
    const handleDeleteService = async (index) => {
        const serviceId = services[index]._id;
        try {
            await api.delete(`/api/products/delete_service/${serviceId}/`, {
                headers: { Authorization: `Bearer ${userInfo.token}` },
            });
            const updatedServices = services.filter((_, i) => i !== index);
            setServices(updatedServices);
            if (selectedServiceIndex === index) handleResetForm();
            setSuccessMessage('Service deleted successfully.');
        } catch (error) {
            setErrorMessage(error.response?.data.message || 'Error deleting service');
        }
    };

    /* ── Image upload ───────────────────────────────────────── */
    const handleImageChange = async (event) => {
        if (!event?.target) return;
        const files = Array.from(event.target.files);
        const serviceId = services[selectedServiceIndex]?._id;
        if (!serviceId) return;
        const currentCount = newService.images?.length || 0;
        if (currentCount + files.length > 10) {
        setErrorMessage(`You can upload up to 10 photos. You already have ${currentCount}.`);
        return;
        }
        // Show previews immediately
        const previewImages = files.map((file) => ({
            preview: URL.createObjectURL(file),
            file,
        }));
        setNewService((prev) => ({
            ...prev,
            images: [...prev.images, ...previewImages],
        }));

        // Upload to server
        const formData = new FormData();
        files.forEach((file) => formData.append('images', file));
        try {
            const response = await fetch(`/api/products/${serviceId}/images/upload/`, {
                method: 'POST',
                body: formData,
                headers: { Authorization: `Bearer ${userInfo.token}` },
            });
            if (response.ok) {
                localStorage.setItem('selectedServiceIndex', selectedServiceIndex);
                setSuccessMessage('Image uploaded successfully!');
            } else {
                setErrorMessage('Image upload failed. Please try again.');
            }
        } catch (error) {
            setErrorMessage('Error uploading images');
        }
    };

    /* ── Add / Update service ───────────────────────────────── */
    const handleServiceSubmit = async () => {
        if (selectedServiceIndex === null) {
            // ── Add new ──
            try {
                const formData = new FormData();
                formData.append('name', newService.name || '');
                formData.append('description', newService.description || '');
                formData.append('price', newService.price || '0');
                formData.append('countInStock', newService.countInStock || '0');
                formData.append('rating', newService.rating || '1');
                formData.append('numReviews', newService.numReviews || '0');
                newService.images.forEach((file) => formData.append('images', file));

                const { data } = await api.post('/api/products/add_service/', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${userInfo.token}`,
                    },
                });
                setServices([...services, data]);
                handleResetForm();
                setSuccessMessage('Service added successfully!');
            } catch (error) {
                setErrorMessage(error.response?.data.message || 'Error adding service');
            }
        } else {
            // ── Update existing ──
            try {
                const formData = new FormData();
                formData.append('name', newService.name || '');
                formData.append('description', newService.description || '');
                formData.append('price', newService.price || '0');
                formData.append('countInStock', newService.countInStock || '0');
                formData.append('rating', newService.rating || '1');
                formData.append('numReviews', newService.numReviews || '0');
                newService.images.forEach((file) => formData.append('images', file));

                await api.put(
                    `/api/products/update_service/${services[selectedServiceIndex]._id}/`,
                    formData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                            Authorization: `Bearer ${userInfo.token}`,
                        },
                    }
                );

                const updatedServices = [...services];
                updatedServices[selectedServiceIndex] = { ...newService };
                setServices(updatedServices);
                handleResetForm();
                setSuccessMessage('Service updated successfully!');
            } catch (error) {
                setErrorMessage(error.response?.data.message || 'Failed to update service');
            }
        }
    };

    const isEditing = selectedServiceIndex !== null;

    return (
        <div className="service-page">

            {/* ── Alerts ───────────────────────────────────────── */}
            {successMessage && <div className="sp-alert sp-alert-success">✅ {successMessage}</div>}
            {errorMessage   && <div className="sp-alert sp-alert-danger">⚠️ {errorMessage}</div>}

            {/* ── Page header ──────────────────────────────────── */}
            <div className="sp-page-header">
                <h1 className="sp-page-title">✨ Manage Services</h1>
                <p className="sp-page-subtitle">
                    {productData.name ? `${productData.name} — ` : ''}
                    Add, edit or remove the services you offer to couples
                </p>
            </div>

            <div style={{ padding: '0 16px' }}>
                <div className="sp-layout">

                    {/* ── Left: service list ───────────────────── */}
                    <div className="sp-list-panel">
                        <div className="sp-list-header">
                            <h3 className="sp-list-title">Your Services</h3>
                            <p className="sp-list-hint">Click a service to edit it</p>
                        </div>
                        <div className="sp-list-body">
                            {/* Add new shortcut */}
                            <div
                                className="sp-add-new-row"
                                onClick={handleResetForm}
                            >
                                <div className="sp-add-new-icon">+</div>
                                <span className="sp-add-new-label">Add New Service</span>
                            </div>

                            {services.length === 0 ? (
                                <div className="sp-empty-state">
                                    No services yet.<br />Add your first service →
                                </div>
                            ) : (
                                services.map((service, index) => (
                                    <div
                                        key={index}
                                        className={`sp-service-row ${selectedServiceIndex === index ? 'active' : ''}`}
                                        onClick={() => handleServiceClick(index)}
                                    >
                                        <div className="sp-service-icon">{index + 1}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className="sp-service-name">
                                                {service.name || 'Unnamed Service'}
                                            </div>
                                            {service.price > 0 && (
                                                <div className="sp-service-price">₹{Number(service.price).toLocaleString('en-IN')}</div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            className="sp-delete-btn"
                                            onClick={(e) => { e.stopPropagation(); handleDeleteService(index); }}
                                            title="Delete service"
                                        >
                                            <FaTrash size={12} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* ── Right: form panel ────────────────────── */}
                    <div className="sp-form-panel">
                        <div className="sp-form-header">
                            <h3 className="sp-form-mode-title">
                                {isEditing ? `Editing: ${newService.name || 'Service'}` : '➕ Add New Service'}
                            </h3>
                            <span className={`sp-form-mode-badge ${isEditing ? 'edit' : 'add'}`}>
                                {isEditing ? 'Edit Mode' : 'New'}
                            </span>
                        </div>

                        <div className="sp-form-body">

                            {/* ── Service details ── */}
                            <div className="sp-section-divider">
                                <span className="sp-section-label">📋 Service Details</span>
                                <div className="sp-section-line"></div>
                            </div>

                            <div className="sp-form-group">
                                <label className="sp-label">Service Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    className="sp-input"
                                    value={newService.name}
                                    onChange={handleServiceChange}
                                    placeholder="e.g. Bridal Makeup, Full Day Photography"
                                />
                            </div>

                            <div className="sp-form-group">
                                <label className="sp-label">Description</label>
                                <textarea
                                    name="description"
                                    className="sp-textarea"
                                    rows={4}
                                    value={newService.description}
                                    onChange={handleServiceChange}
                                    placeholder="What's included? Duration, deliverables, extras..."
                                />
                            </div>

                            {/* ── Pricing ── */}
                            <div className="sp-section-divider">
                                <span className="sp-section-label">💰 Pricing</span>
                                <div className="sp-section-line"></div>
                            </div>

                            <div className="sp-form-group">
                                <label className="sp-label">Price</label>
                                <div className="sp-price-wrap">
                                    <span className="sp-price-prefix">₹</span>
                                    <input
                                        type="number"
                                        name="price"
                                        className="sp-price-input"
                                        value={newService.price}
                                        onChange={handleServiceChange}
                                        placeholder="0 = Contact for Price"
                                    />
                                </div>
                            </div>

                            {/* ── Photos ── */}
<div className="sp-section-divider">
  <span className="sp-section-label">📸 Photos</span>
  <div className="sp-section-line"></div>
</div>

{/* inline limit error */}
{(newService.images?.length || 0) >= 10 && (
  <div className="sp-image-limit-error">
    ⚠️ Maximum 10 photos reached. Remove a photo to upload a new one.
  </div>
)}

<div className="sp-image-manager">
  {newService.images?.length > 0
    ? renderImages(newService.images)
    : <div className="sp-image-empty">No photos yet — add some below 👇</div>
  }
  {(newService.images?.length || 0) < 10 && (
    <label className="sp-image-add-tile" title="Add photos">
      <input
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleImageChange}
      />
      <span className="sp-image-add-icon">+</span>
      <span className="sp-image-add-label">Add Photo</span>
    </label>
  )}
</div>

<div className="sp-image-footer">
  <p className="sp-image-hint">
    Click ✕ on a photo to remove it.
    {!isEditing && ' Save the service first before uploading photos.'}
  </p>
  <span className="sp-image-limit-note">
    {newService.images?.length || 0} / 10 photos
  </span>
</div>

                            {/* ── Action buttons ── */}
                            <div className="sp-btn-row">
                                {isEditing && (
                                    <button
                                        type="button"
                                        className="sp-cancel-btn"
                                        onClick={handleResetForm}
                                    >
                                        ✕ Cancel
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="sp-submit-btn"
                                    onClick={handleServiceSubmit}
                                    disabled={isSubmitDisabled}
                                >
                                    {isEditing ? '💾 Save Changes' : '➕ Add Service'}
                                </button>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ServicePage;