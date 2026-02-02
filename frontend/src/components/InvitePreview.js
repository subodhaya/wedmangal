import React from 'react';

function InvitePreview({ formData }) {
    const {
        brideName,
        groomName,
        date,
        venue,
        time,
        description,
        file,
        template,
    } = formData;

    const previewImage = file ? URL.createObjectURL(file) : '';
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const renderTemplate = () => {
        switch (template) {
            case 'Template 1':
                return (
                    <div style={{ border: '2px solid black', padding: '20px' }}>
                        <h1>Wedding Invitation</h1>
                        <img src={previewImage} alt="Preview" style={{ maxWidth: '100%' }} />
                        <p>{`Bride: ${brideName}`}</p>
                        <p>{`Groom: ${groomName}`}</p>
                        <p>{`Date: ${date}`}</p>
                        <p>{`Time: ${time}`}</p>
                        <p>{`Venue: ${venue}`}</p>
                        <p>{description}</p>
                    </div>
                );
            case 'Template 2':
                return (
                    <div style={{ border: '2px solid blue', padding: '20px' }}>
                        <h1>You're Invited!</h1>
                        <img src={previewImage} alt="Preview" style={{ maxWidth: '100%' }} />
                        <p>{`${brideName} & ${groomName}`}</p>
                        <p>{`On: ${date} at ${time}`}</p>
                        <p>{`Venue: ${venue}`}</p>
                        <p>{description}</p>
                    </div>
                );
            case 'Template 3':
                return (
                    <div style={{ border: '2px solid green', padding: '20px' }}>
                        <h1>Join Us!</h1>
                        <img src={previewImage} alt="Preview" style={{ maxWidth: '100%' }} />
                        <p>{`Celebrating ${brideName} & ${groomName}`}</p>
                        <p>{`Date: ${date}`}</p>
                        <p>{`Time: ${time}`}</p>
                        <p>{`Venue: ${venue}`}</p>
                        <p>{description}</p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div>
            <h2>Preview</h2>
            {renderTemplate()}
        </div>
    );
}

export default InvitePreview;
