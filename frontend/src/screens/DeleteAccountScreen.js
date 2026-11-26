import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import api from '../utils/api';
import './RemovalRequestScreen.css';   // shared policy-page styles (rrp-)

const EMAIL = 'subodhayas@gmail.com';
const KEEP_ON_DEVICE = ['wm_city'];
const DONE = 'wm_account_deleted';

const loggedInUser = () => {
  try { const u = JSON.parse(localStorage.getItem('userInfo')); return u?.token ? u : null; } catch { return null; }
};

// Everything this account left on the device (login, cart, wishlist, plan…)
const clearDevice = () => {
  Object.keys(localStorage).filter(k => !KEEP_ON_DEVICE.includes(k)).forEach(k => localStorage.removeItem(k));
  sessionStorage.clear();
  sessionStorage.setItem(DONE, '1');
};

function DeleteForm({ user }) {
  const [typed, setTyped] = useState('');
  const [state, setState] = useState({ step: 'idle' });   // idle | deleting | error

  const submit = async (e) => {
    e.preventDefault();
    setState({ step: 'deleting' });
    try {
      await api.post('/api/users/delete-account/', { confirm: typed });
      clearDevice();
      window.location.replace('/delete-account');   // full load, so the header forgets the login too
    } catch (err) {
      setState({ step: 'error', message: err.response?.data?.detail || 'We couldn’t delete the account right now. Please try again.' });
    }
  };

  return (
    <form onSubmit={submit}>
      <p>You are logged in as <strong>{[user.name, user.email, user.phone].filter((v, i, all) => v && all.indexOf(v) === i).join(' · ')}</strong>.</p>
      <label className="rrp-label">
        Type DELETE to confirm. This can’t be undone.
        <input className="rrp-input" value={typed} onChange={e => setTyped(e.target.value)}
          autoComplete="off" autoCapitalize="characters" maxLength={10} />
      </label>
      <button type="submit" className="rrp-btn" disabled={typed !== 'DELETE' || state.step === 'deleting'}>
        {state.step === 'deleting' ? 'Deleting…' : 'Delete my account'}
      </button>
      {state.step === 'error' && <p className="rrp-error" role="alert">{state.message}</p>}
    </form>
  );
}

export default function DeleteAccountScreen() {
  const user = loggedInUser();
  const done = !user && sessionStorage.getItem(DONE) === '1';

  return (
    <div className="rrp-page">
      <Helmet>
        <title>Delete your account | WedMangal</title>
        <meta name="description" content="How to delete your WedMangal account, what is erased and what is kept." />
        <link rel="canonical" href="https://www.wedmangal.com/delete-account" />
      </Helmet>
      <div className="rrp-header">
        <h1 className="rrp-title">Delete your account</h1>
        <p className="rrp-sub">For WedMangal website and Android app accounts.</p>
      </div>

      {done && <div className="rrp-card" role="status"><strong>Your account has been deleted.</strong> You have been logged out on this device, and every other login has stopped working.</div>}

      <section className="rrp-card">
        <h2 className="rrp-h2">How to delete it</h2>
        <ol>
          <li>Log in with your phone, Google or email.</li>
          <li>Open this page (also under Profile).</li>
          <li>Type DELETE and press <strong>Delete my account</strong>. It happens immediately.</li>
        </ol>
        {user ? <DeleteForm user={user} /> : !done && <Link className="rrp-btn" style={{ display: 'inline-block', textDecoration: 'none' }} to="/login?redirect=/delete-account">Log in to delete</Link>}
        <p style={{ marginTop: 14 }}>Can’t log in? Email <a href={`mailto:${EMAIL}?subject=Delete%20my%20WedMangal%20account`}>{EMAIL}</a> with the phone number or email on the account. We will check it is yours and delete it.</p>
      </section>

      <section className="rrp-card">
        <h2 className="rrp-h2">What is erased</h2>
        <ul>
          <li>Your name, email, phone number, password, wedding date and Google login link.</li>
          <li>Your wishlist, cart, budget, saved requirements, claims and booking addresses.</li>
          <li>Your name, phone number and message in enquiries you sent while logged in, and the link between you and your searches and activity.</li>
          <li><strong>Business owners:</strong> your listing is taken offline. If you created it, its details, photos and videos are erased. If you claimed an existing listing, it is released from you, and your private number and videos are erased.</li>
        </ul>
      </section>

      <section className="rrp-card">
        <h2 className="rrp-h2">What stays, without your name</h2>
        <ul>
          <li>Booking records (service, date, price) for the vendor, shown as “Deleted user”. <strong>Upcoming bookings are cancelled</strong>, so tell the vendor too.</li>
          <li>Reviews, shown as “Deleted user”. Email us if you want the text removed as well.</li>
          <li>Anonymous activity counts, and public business information on listings you had claimed (kept offline until we review it).</li>
          <li>Messages already sent to a vendor, which we can’t take back. Backup copies until the backups are replaced.</li>
          <li>Listing removal requests you sent us, as a record of the request.</li>
        </ul>
        <p>See the <Link to="/privacy-policy">Privacy Policy</Link>.</p>
      </section>
    </div>
  );
}
