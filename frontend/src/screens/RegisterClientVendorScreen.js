// Admin: register a vendor's business for a client, then hand it over.
// 1. Find the client's account (by phone / e-mail) — or a new one is created
// 2. The same business form vendors use (AddProductPage in client mode)
// 3. Handover message telling the client how to log in
import React, { useState } from 'react';
import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import AddProductPage from '../components/AddProductPage';
import '../components/AddProductPage.css';

const LOGIN_URL = 'https://www.wedmangal.com/login?as=vendor';

const METHOD_LABEL = {
    phone: 'phone code',
    email_password: 'e-mail + password',
    google: 'Google (if that e-mail is a Gmail)',
};

// input + hint stacked, filling the field column (ap-form-group lays out in a row)
const stack = { flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 };

const box = (bg, border) => ({
    background: bg, border: `1px solid ${border}`, borderRadius: 12,
    padding: '12px 14px', margin: '12px 0', fontSize: '0.92rem', lineHeight: 1.5,
});

function AccountCard({ account, title }) {
    return (
        <div>
            {title && <strong>{title}</strong>}
            <div>👤 {account.name || '(no name)'} · role: <b>{account.role || '—'}</b></div>
            {account.phone && <div>📱 {account.phone}</div>}
            {account.email && <div>✉️ {account.email}</div>}
            <div>🔑 Logs in with: {account.login_methods.length
                ? account.login_methods.map(m => METHOD_LABEL[m]).join(', ')
                : 'nothing yet'}</div>
            {account.business && <div>🏪 Business: {account.business.name} (#{account.business.id})</div>}
        </div>
    );
}

function handoverText(result, client) {
    const acc = result.account;
    const lines = [
        `Hi ${acc.name || ''}! 🎉 Your business "${result.businessName}" is now registered on WedMangal.`,
        '',
        `Log in here: ${LOGIN_URL}`,
        '(tap "I\'m a wedding vendor")',
    ];
    if (acc.phone) lines.push(`• With your mobile number ${acc.phone} — we'll send you a 6-digit code.`);
    if (acc.email && client.password && result.created_account) {
        lines.push(`• Or with e-mail ${acc.email} and temporary password: ${client.password}`);
        lines.push('  Please change your password after logging in (Profile → New password).');
    } else if (acc.email && acc.login_methods.includes('email_password')) {
        lines.push(`• Or with your e-mail ${acc.email} and your usual password.`);
    }
    lines.push('', 'Your listing will be visible to couples once it is approved. From your dashboard you can add photos, services and prices any time.');
    return lines.join('\n');
}

function RegisterClientVendorScreen() {
    const [phone, setPhone]       = useState('');
    const [email, setEmail]       = useState('');
    const [name, setName]         = useState('');
    const [password, setPassword] = useState('');

    const [checking, setChecking] = useState(false);
    const [check, setCheck]       = useState(null);   // lookup response, or { error, conflict }
    const [step, setStep]         = useState('account'); // 'account' | 'business' | 'done'
    const [result, setResult]     = useState(null);
    const [copied, setCopied]     = useState(false);

    const resetCheck = (setter) => (e) => { setter(e.target.value); setCheck(null); };

    const lookup = async (e) => {
        e.preventDefault();
        setChecking(true);
        setCheck(null);
        try {
            const { data } = await api.get('/api/products/admin/client-account/', { params: { phone, email } });
            setCheck(data);
            if (data.found && data.account.name && !name) setName(data.account.name);
        } catch (err) {
            setCheck({ error: err.response?.data?.detail || 'Could not check the account.', conflict: err.response?.data?.conflict });
        }
        setChecking(false);
    };

    const isNew = check && !check.error && !check.found;
    const needsPassword = isNew && !phone.trim();
    const canContinue = check && !check.error && !check.blocked
        && (!needsPassword || password.length >= 6)
        && (!isNew || !password || password.length >= 6);

    const startOver = () => {
        setPhone(''); setEmail(''); setName(''); setPassword('');
        setCheck(null); setResult(null); setStep('account'); setCopied(false);
    };

    // ── Step 3: handover ──
    if (step === 'done') {
        const text = result ? handoverText(result, { password }) : '';
        const waPhone = result?.account?.phone;
        return (
            <div className="add-product-page">
                <Container style={{ maxWidth: 720, padding: '24px 16px' }}>
                    <div className="ap-form-section">
                        <div className="ap-form-header">
                            <h2 className="ap-form-title">✅ Registered — hand it over</h2>
                            <p className="ap-form-subtitle">Send this to the client so they know how to log in.</p>
                        </div>
                        <div className="ap-form-body">
                            {result ? (
                                <>
                                    <div style={box('#eefaf1', '#9fd8ad')}>
                                        <AccountCard account={result.account}
                                            title={result.created_account ? 'New account created' : 'Added to their existing account'} />
                                    </div>
                                    <div style={box('#fff8e8', '#e8c77a')}>
                                        ⏳ The listing is <b>waiting for approval</b>. Approve it in{' '}
                                        <Link to="/productlist/">Services List</Link> when it's ready.
                                    </div>
                                    <label className="ap-label" htmlFor="handover">Handover message</label>
                                    <textarea id="handover" className="ap-textarea" rows={11} readOnly value={text} />
                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                                        <button type="button" className="ap-submit-btn" style={{ width: 'auto' }}
                                            onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); }}>
                                            {copied ? '✓ Copied' : '📋 Copy message'}
                                        </button>
                                        {waPhone && (
                                            <a className="ap-add-service-btn" target="_blank" rel="noreferrer"
                                                href={`https://wa.me/91${waPhone}?text=${encodeURIComponent(text)}`}>
                                                💬 Send on WhatsApp
                                            </a>
                                        )}
                                        <button type="button" className="ap-add-service-btn" onClick={startOver}>
                                            ➕ Register another client
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <p>Done. <button type="button" className="ap-add-service-btn" onClick={startOver}>Register another client</button></p>
                            )}
                        </div>
                    </div>
                </Container>
            </div>
        );
    }

    // ── Step 2: the same business form vendors use ──
    if (step === 'business') {
        return (
            <>
                <Container style={{ maxWidth: 900, paddingTop: 16 }}>
                    <div style={box('#f5eaf0', '#d9b8c9')}>
                        <b>Registering for:</b> {name || '(client)'} {phone && `· 📱 ${phone}`} {email && `· ✉️ ${email}`}
                        {check?.found ? ' — existing account' : ' — new account'}{' '}
                        <button type="button" className="ap-add-service-btn" style={{ padding: '2px 10px', marginLeft: 6 }}
                            onClick={() => setStep('account')}>change</button>
                    </div>
                </Container>
                <AddProductPage
                    client={{ phone, email, name, password }}
                    onClientDone={(data) => {
                        setResult(data ? { ...data, businessName: data.account?.business?.name || '' } : null);
                        setStep('done');
                    }}
                />
            </>
        );
    }

    // ── Step 1: whose account? ──
    return (
        <div className="add-product-page">
            <Container style={{ maxWidth: 720, padding: '24px 16px' }}>
                <div className="ap-form-section">
                    <div className="ap-form-header">
                        <h2 className="ap-form-title">🤝 Register a Vendor for a Client</h2>
                        <p className="ap-form-subtitle">
                            Step 1 of 2 — whose business is it? If the client already logged in to WedMangal
                            (by phone or e-mail), the business goes onto that account.
                        </p>
                    </div>
                    <div className="ap-form-body">
                        <form onSubmit={lookup}>
                            <div className="ap-form-group">
                                <label className="ap-label" htmlFor="cv-phone">Client's mobile number</label>
                                <div style={stack}>
                                    <input id="cv-phone" className="ap-input" inputMode="numeric" placeholder="10-digit mobile, e.g. 98765 43210"
                                        value={phone} onChange={resetCheck(setPhone)} />
                                    <span className="ap-hint">The number they log in with (or will). Best way in for most clients.</span>
                                </div>
                            </div>
                            <div className="ap-form-group">
                                <label className="ap-label" htmlFor="cv-email">Client's e-mail (optional)</label>
                                <input id="cv-email" className="ap-input" type="email" placeholder="client@example.com"
                                    value={email} onChange={resetCheck(setEmail)} />
                            </div>
                            <div className="ap-form-group">
                                <label className="ap-label" htmlFor="cv-name">Client's name</label>
                                <input id="cv-name" className="ap-input" placeholder="e.g. Priya Kumar"
                                    value={name} onChange={(e) => setName(e.target.value)} />
                            </div>
                            <button type="submit" className="ap-submit-btn" disabled={checking || (!phone.trim() && !email.trim())}>
                                {checking ? '⏳ Checking…' : '🔍 Check account'}
                            </button>
                        </form>

                        {check?.error && (
                            <div style={box('#fdecec', '#f0a8a8')}>
                                ⚠️ {check.error}
                                {check.conflict && (
                                    <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                                        <AccountCard account={check.conflict.phone_account} title="Account with this phone:" />
                                        <AccountCard account={check.conflict.email_account} title="Account with this e-mail:" />
                                    </div>
                                )}
                            </div>
                        )}

                        {check?.found && (
                            <div style={box(check.blocked ? '#fdecec' : '#eefaf1', check.blocked ? '#f0a8a8' : '#9fd8ad')}>
                                <AccountCard account={check.account} title={`Existing account found (by ${check.matched_by}):`} />
                                <div style={{ marginTop: 8 }}>
                                    {check.blocked
                                        ? <>⛔ {check.blocked}</>
                                        : <>✅ The business will be added to this account. The client keeps logging in the same way.</>}
                                </div>
                                {!check.blocked && phone && email && !(check.account.phone && check.account.email) && (
                                    <div style={{ marginTop: 6, fontSize: '0.85rem' }}>
                                        ℹ️ Only the {check.matched_by} is on this account. The other one is not added —
                                        the client can add their phone themselves after logging in.
                                    </div>
                                )}
                            </div>
                        )}

                        {isNew && (
                            <div style={box('#f2f6ff', '#b9c8ef')}>
                                🆕 No account yet — a <b>new vendor account</b> will be created.
                                {phone && <div>📱 They'll log in with a code sent to {phone}.</div>}
                                {email && (
                                    <div className="ap-form-group" style={{ marginTop: 10, marginBottom: 0 }}>
                                        <label className="ap-label" htmlFor="cv-pass">
                                            Temporary password for e-mail login {needsPassword ? '(required)' : '(optional)'}
                                        </label>
                                        <div style={stack}>
                                            <input id="cv-pass" className="ap-input" type="text" placeholder="At least 6 characters"
                                                value={password} onChange={(e) => setPassword(e.target.value)} />
                                            <span className="ap-hint">It goes into the handover message. Ask them to change it.</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {check && !check.error && (
                            <button type="button" className="ap-submit-btn" disabled={!canContinue}
                                onClick={() => setStep('business')}
                                style={{ marginTop: 6, opacity: canContinue ? 1 : 0.45, cursor: canContinue ? 'pointer' : 'not-allowed' }}>
                                Continue → Business details
                            </button>
                        )}
                    </div>
                </div>
            </Container>
        </div>
    );
}

export default RegisterClientVendorScreen;
