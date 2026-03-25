import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { FaHeart, FaDownload, FaWhatsapp, FaCamera } from 'react-icons/fa';
import './InviteForm.css';

const templateImages = [
  'invite1.jpg','invite2.jpg','invite3.jpg','invite5.jpg',
  'invite7.jpg','invite6.jpg','invite9.jpg','invite12.jpg',
  'invite13.jpg','invite15.jpg',
].map(f => `/static/images/invite_images/${f}`);

const InviteForm = () => {
  const [formData, setFormData] = useState({
    brideName: '', groomName: '', date: '', venue: '',
    time: '', description: '', brideImage: null,
    groomImage: null, template: templateImages[0],
  });
  const [customTemplate, setCustomTemplate] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const previewRef = useRef(null);

  const set = (key, val) => setFormData(p => ({ ...p, [key]: val }));

  useEffect(() => {
    if (successMessage || errorMessage) {
      const t = setTimeout(() => { setSuccessMessage(''); setErrorMessage(''); }, 4000);
      return () => clearTimeout(t);
    }
  }, [successMessage, errorMessage]);

  const handleTemplateCustomUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomTemplate(url);
      set('template', url);
    }
  };

  const handleDownload = () => {
    const el = document.getElementById('invitation');
    html2canvas(el, { useCORS: true, scale: 2 }).then(canvas => {
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${formData.brideName || 'wedding'}-invitation.png`;
      link.click();
      setSuccessMessage('Invitation downloaded!');
    });
  };

  const handleShare = () => {
    html2canvas(document.getElementById('invitation'), { useCORS: true }).then(canvas => {
      canvas.toBlob(blob => {
        const imageUrl = URL.createObjectURL(blob);
        const msg = encodeURIComponent('You are cordially invited! 💍');
        window.open(`https://api.whatsapp.com/send?text=${msg}%20${encodeURIComponent(imageUrl)}`);
      }, 'image/png');
    });
  };

  const bridePreview = formData.brideImage ? URL.createObjectURL(formData.brideImage) : null;
  const groomPreview = formData.groomImage ? URL.createObjectURL(formData.groomImage) : null;
  const isSample = !formData.brideName && !formData.groomName && !formData.date && !formData.venue && !bridePreview && !groomPreview;

  const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hr = parseInt(h);
    return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  };

  return (
    <div className="invite-page">
      {successMessage && <div className="invite-toast invite-toast--success">{successMessage}</div>}
      {errorMessage && <div className="invite-toast invite-toast--error">{errorMessage}</div>}

      <div className="invite-header">
        <span className="invite-header__label">WedMangal</span>
        <h1 className="invite-header__title">Create Your Invitation</h1>
        <p className="invite-header__sub">Design a beautiful invite to share with your loved ones</p>
      </div>

      <div className="invite-layout">
        {/* ── LEFT: FORM ── */}
        <div className="invite-form-panel">

          <div className="form-section">
            <div className="form-section__label">Couple</div>
            <div className="form-row form-row--two">
              <div className="form-field">
                <label>Bride's Name</label>
                <input type="text" value={formData.brideName}
                  onChange={e => set('brideName', e.target.value)}
                  placeholder="e.g. Priya" />
              </div>
              <div className="form-field">
                <label>Groom's Name</label>
                <input type="text" value={formData.groomName}
                  onChange={e => set('groomName', e.target.value)}
                  placeholder="e.g. Arjun" />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section__label">When &amp; Where</div>
            <div className="form-row form-row--two">
              <div className="form-field">
                <label>Date</label>
                <input type="date" value={formData.date}
                  onChange={e => set('date', e.target.value)} />
              </div>
              <div className="form-field">
                <label>Time</label>
                <input type="time" value={formData.time}
                  onChange={e => set('time', e.target.value)} />
              </div>
            </div>
            <div className="form-field">
              <label>Venue</label>
              <input type="text" value={formData.venue}
                onChange={e => set('venue', e.target.value)}
                placeholder="e.g. The Grand Palace, Chennai" />
            </div>
            <div className="form-field">
              <label>Message / Description</label>
              <textarea rows={3} value={formData.description}
                onChange={e => {
                  const words = e.target.value.trim().split(/\s+/).filter(Boolean);
                  if (words.length <= 20 || e.target.value.length < formData.description.length) {
                    set('description', e.target.value);
                  }
                }}
                placeholder="Add a personal note... (max 20 words)" />
              <span className="form-field__counter">
                {formData.description.trim() === '' ? 0 : formData.description.trim().split(/\s+/).filter(Boolean).length} / 20 words
              </span>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section__label">Photos</div>
            <div className="form-row form-row--two">
              <div className="photo-upload-field">
                <label htmlFor="brideImageInput" className="photo-upload-label">
                  <div className="photo-upload-thumb"
                    style={bridePreview ? { backgroundImage: `url(${bridePreview})` } : {}}>
                    {!bridePreview && <FaCamera className="photo-upload-icon" />}
                  </div>
                  <span>Bride's Photo</span>
                </label>
                <input id="brideImageInput" type="file" accept="image/*"
                  onChange={e => set('brideImage', e.target.files[0])} />
              </div>
              <div className="photo-upload-field">
                <label htmlFor="groomImageInput" className="photo-upload-label">
                  <div className="photo-upload-thumb"
                    style={groomPreview ? { backgroundImage: `url(${groomPreview})` } : {}}>
                    {!groomPreview && <FaCamera className="photo-upload-icon" />}
                  </div>
                  <span>Groom's Photo</span>
                </label>
                <input id="groomImageInput" type="file" accept="image/*"
                  onChange={e => set('groomImage', e.target.files[0])} />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section__label">Background Template</div>
            <div className="template-grid">
              {templateImages.map((img, i) => (
                <div key={i}
                  className={`template-thumb ${formData.template === img ? 'template-thumb--active' : ''}`}
                  style={{ backgroundImage: `url(${img})` }}
                  onClick={() => set('template', img)} />
              ))}
              <label className="template-thumb template-thumb--upload" htmlFor="customBgUpload">
                <span>+ Upload</span>
                <input id="customBgUpload" type="file" accept="image/*"
                  onChange={handleTemplateCustomUpload} />
              </label>
              {customTemplate && (
                <div
                  className={`template-thumb ${formData.template === customTemplate ? 'template-thumb--active' : ''}`}
                  style={{ backgroundImage: `url(${customTemplate})` }}
                  onClick={() => set('template', customTemplate)} />
              )}
            </div>
          </div>

        </div>

        {/* ── RIGHT: PREVIEW ── */}
        <div className="invite-preview-panel">
          <div className="preview-sticky">
            <div className="preview-label">
              {isSample ? 'Sample Preview' : 'Live Preview'}
            </div>

            {isSample && (
              <div className="sample-preview-wrap">
                <img src="/static/images/invite_images/sample-preview.png" alt="Sample invitation" className="sample-preview-img" />
                <div className="sample-preview-hint">Fill in the form to see your personalised invitation here</div>
              </div>
            )}

            <div id="invitation" className="invitation-card"
              style={{ backgroundImage: `url(${formData.template})`, display: isSample ? 'none' : undefined }}>
              <div className="invitation-overlay" />
              <div className="invitation-content">
                <div className="invitation-top-tag">You Are Cordially Invited</div>
                <div className="invitation-divider">✦ ✦ ✦</div>

                <div className="invitation-photos">
                  <div className="invitation-photo-wrap">
                    {bridePreview
                      ? <img src={bridePreview} alt="Bride" className="invitation-photo" />
                      : <div className="invitation-photo invitation-photo--placeholder">B</div>}
                    <div className="invitation-photo-name">{formData.brideName || 'Bride'}</div>
                  </div>
                  <div className="invitation-heart"><FaHeart /></div>
                  <div className="invitation-photo-wrap">
                    {groomPreview
                      ? <img src={groomPreview} alt="Groom" className="invitation-photo" />
                      : <div className="invitation-photo invitation-photo--placeholder">G</div>}
                    <div className="invitation-photo-name">{formData.groomName || 'Groom'}</div>
                  </div>
                </div>

                <div className="invitation-divider invitation-divider--light">— ♦ —</div>

                <div className="invitation-details">
                  {formData.date && (
                    <div className="invitation-detail-row">
                      <span className="invitation-detail-icon">📅</span>
                      <span>{formatDate(formData.date)}</span>
                    </div>
                  )}
                  {formData.time && (
                    <div className="invitation-detail-row">
                      <span className="invitation-detail-icon">🕐</span>
                      <span>{formatTime(formData.time)}</span>
                    </div>
                  )}
                  {formData.venue && (
                    <div className="invitation-detail-row">
                      <span className="invitation-detail-icon">📍</span>
                      <span>{formData.venue}</span>
                    </div>
                  )}
                </div>

                {formData.description && (
                  <div className="invitation-message">"{formData.description}"</div>
                )}

                <div className="invitation-footer">WedMangal · wedmangal.com</div>
              </div>
            </div>

            <div className="invite-actions">
              <button className="invite-btn invite-btn--download" onClick={handleDownload}>
                <FaDownload /> Download
              </button>
              <button className="invite-btn invite-btn--whatsapp" onClick={handleShare}>
                <FaWhatsapp /> Share
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteForm;