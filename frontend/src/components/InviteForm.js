import React, { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { Form, Button, Row, Col } from 'react-bootstrap';
import { FaHeart, FaPlus } from 'react-icons/fa';

const templateImages = [
  'invite1.jpg',
  'invite2.jpg',
  'invite3.jpg',
  'invite5.jpg',
  'invite7.jpg',
  'invite6.jpg',
  'invite9.jpg',
  'invite12.jpg',
  'invite13.jpg',
  'invite15.jpg',
  'custom-upload-icon.png',
].map(filename => `/static/images/invite_images/${filename}`);

const InviteForm = () => {
  const [formData, setFormData] = useState({
    brideName: '',
    groomName: '',
    date: '',
    venue: '',
    time: '',
    description: '',
    brideImage: null,
    groomImage: null,
    template: null,
    file: null,
  });

  const [customTemplate, setCustomTemplate] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const handleDownload = () => {
    html2canvas(document.getElementById('invitation')).then((canvas) => {
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = 'invitation.png';
      link.click();
    });
  };

  const handleTemplateClick = (index) => {
    if (index === templateImages.length - 1) {
      document.getElementById('customFileUpload').click();
    } else {
      setFormData({ ...formData, template: templateImages[index] });
    }
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomTemplate(url);
      setFormData({ ...formData, template: url });
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log('Form submitted', formData);
  };

  const handleShare = () => {
    html2canvas(document.getElementById('invitation'), { useCORS: true }).then((canvas) => {
        canvas.toBlob((blob) => {
          const imageUrl = URL.createObjectURL(blob);
          const message = encodeURIComponent('Check out my invitation!');
          const shareUrl = `https://api.whatsapp.com/send?text=${message}%20${encodeURIComponent(imageUrl)}`;
            window.open(shareUrl);
        }, 'image/png');
    }).catch((error) => {
        console.error('Error generating canvas:', error); // Log any errors
      });
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
    <div className="container-fluid" style={{ marginTop: '50px' }}>
      <div className="highlight-section">
        <div className="col-xs-12 text-center">
          <h2>Prepare Your Invite</h2>
          <Form onSubmit={handleSubmit}>
            <Form.Group controlId="brideName" style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <Form.Label style={{ marginRight: '10px', minWidth: '150px' }}>Bride's Name</Form.Label>
              <Form.Control
                type="text"
                name="brideName"
                value={formData.brideName}
                onChange={(e) => setFormData({ ...formData, brideName: e.target.value })}
                required
                style={{ borderRadius: '0.25rem' }}
              />
            </Form.Group>
            <Form.Group controlId="groomName" style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <Form.Label style={{ marginRight: '10px', minWidth: '150px' }}>Groom's Name</Form.Label>
              <Form.Control
                type="text"
                name="groomName"
                value={formData.groomName}
                onChange={(e) => setFormData({ ...formData, groomName: e.target.value })}
                required
                style={{ borderRadius: '0.25rem' }}
              />
            </Form.Group>
            <Row style={{ marginBottom: '1rem' }}>
              <Col md={6}>
                <Form.Group controlId="date" style={{ display: 'flex', alignItems: 'center' }}>
                  <Form.Label style={{ paddingLeft: '120px' }}>Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    style={{ borderRadius: '0.25rem' }}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="time" style={{ display: 'flex', alignItems: 'center' }}>
                  <Form.Label style={{ paddingLeft: '120px' }}>Time</Form.Label>
                  <Form.Control
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                    style={{ borderRadius: '0.25rem' }}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group controlId="venue" style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <Form.Label style={{ marginRight: '10px', minWidth: '150px' }}>Venue</Form.Label>
              <Form.Control
                type="text"
                name="venue"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                required
                style={{ borderRadius: '0.25rem' }}
              />
            </Form.Group>
            <Form.Group controlId="description" style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <Form.Label style={{ marginRight: '10px', minWidth: '150px' }}>Description</Form.Label>
              <Form.Control
                as="textarea"
                name="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                style={{ borderRadius: '0.25rem' }}
              />
            </Form.Group>
            <Form.Group controlId="brideImage" style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <Form.Label style={{ marginRight: '10px', minWidth: '150px' }}>Bride's Photo</Form.Label>
              <Form.Control
                type="file"
                name="brideImage"
                accept="image/*"
                onChange={(e) => setFormData({ ...formData, brideImage: e.target.files[0] })}
                required
                style={{ borderRadius: '0.25rem' }}
              />
            </Form.Group>
            <Form.Group controlId="groomImage" style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <Form.Label style={{ marginRight: '10px', minWidth: '150px' }}>Groom's Photo</Form.Label>
              <Form.Control
                type="file"
                name="groomImage"
                accept="image/*"
                onChange={(e) => setFormData({ ...formData, groomImage: e.target.files[0] })}
                required
                style={{ borderRadius: '0.25rem' }}
              />
            </Form.Group>
            <div style={{ marginBottom: '20px' }}>
              <h4>Select a Background Template or Upload Your Own Image</h4>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                {templateImages.map((image, index) => (
                  <div
                    key={index}
                    onClick={() => handleTemplateClick(index)}
                    style={{
                      width: '100px',
                      height: '100px',
                      backgroundImage: `url(${index === templateImages.length - 1 && customTemplate ? customTemplate : image})`,
                      backgroundSize: 'cover',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                      border: formData.template === (index === templateImages.length - 1 && customTemplate ? customTemplate : image) ? '3px solid #007bff' : '2px solid #ddd',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      position: 'relative',
                    }}
                  >
                    {index === templateImages.length - 1 && !customTemplate && (
                      <span style={{ fontSize: '18px', color: '#333' }}>Upload</span>
                    )}
                  </div>
                ))}
                <Form.Control
                  id="customFileUpload"
                  type="file"
                  name="file"
                  accept="image/*"
                  onChange={handleChange}
                  style={{ display: 'none' }} // Hidden file input
                />
              </div>
            </div>
            
            <Button variant="outline-warning" type="submit">
              PREVIEW
            </Button>
          </Form>
        </div>
      </div>

      <div
  id="invitation"
  style={{
    width: '500px',
    height: '700px',
    margin: '50px auto',
    padding: '20px',
    backgroundImage: `url(${formData.template || templateImages[0]})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    fontFamily: "'Dancing Script', cursive",
    position: 'relative',
              
  }}
>



  <div style={{ position: 'relative', zIndex: 2 }}>
  <h5 style={{ marginTop: '60px' }}>You are invited!!</h5> {/* Moved down with margin */}
   
  
    <h4 style={{ marginTop: '30px' }}>PLEASE JOIN US TO CELEBRATE</h4> {/* Moved down with margin */}
    <h2 style={{ marginTop: '20px' }}>Our Wedding</h2> {/* Added margin-bottom for spacing */}
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
      {formData.brideImage && (
        <img
          src={URL.createObjectURL(formData.brideImage)}
          alt="Bride"
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            objectFit: 'cover',
            marginRight: '10px',
          }}
        />
      )}
      <FaHeart style={{ margin: '0 10px', color: 'red', fontSize: '30px' }} /> {/* Plus icon */}
      {formData.groomImage && (
        <img
          src={URL.createObjectURL(formData.groomImage)}
          alt="Groom"
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            objectFit: 'cover',
            marginLeft: '10px',
          }}
        />
      )}
    </div>
    <h2 style={{ margin: 0 }}>{formData.brideName}</h2>
    <FaPlus style={{ margin: '0 10px', color: '#ff69b4', fontSize: '30px' }} /> 
    <h2 style={{ margin: 0 }}>{formData.groomName}</h2>
    <p style={{  color: 'black' }}>Date: {formData.date}</p>
    <p style={{  color: 'black' }}>Time: {formData.time}</p>
    <p style={{  color: 'black' }}>Venue: {formData.venue}</p>
    <p style={{  color: 'black' }}>{formData.description}</p>
  </div>
</div>

<div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
  <Button variant="success" onClick={handleDownload}>
          Download Invitation
        </Button>
  <Button variant="primary" onClick={handleShare}>
    Share via WhatsApp
        </Button>
      </div>
    </div>
    </div>
  );
};

export default InviteForm;
