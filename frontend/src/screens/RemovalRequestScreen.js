import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { postJSON } from '../utils/analytics';
import './RemovalRequestScreen.css';

const SECTIONS = [
  {
    id: 'unlist',
    title: 'Request removal of a business listing',
    body: (
      <>
        <p>Some listings on WedMangal are created from publicly available business information. If you own the business, or are authorised to represent it, and do not want it listed, you can ask us to remove it.</p>
        <ol>
          <li>Open the business’s page on WedMangal.</li>
          <li>Scroll to the bottom and choose <strong>Request to unlist this business</strong>.</li>
          <li>Fill in your details and the reason, and send the request. You will get a reference number by e-mail.</li>
        </ol>
        <p>You don’t need a WedMangal account, and you don’t have to claim the listing first.</p>
      </>
    ),
  },
  {
    id: 'incorrect',
    title: 'Report incorrect information',
    body: (
      <p>If a phone number, address, photo caption or other detail is wrong, open the listing and choose <strong>Report incorrect information</strong> at the bottom of the page. Tell us what is wrong and, if you can, the correct details. Business owners can also <strong>claim the listing</strong> to update it themselves.</p>
    ),
  },
  {
    id: 'copyright',
    title: 'Report a photo or copyright concern',
    body: (
      <p>If a photo, video or text on a listing is yours and is shown without your permission, open the listing and choose <strong>Report a photo or copyright concern</strong>. Tell us which content it is and, if you have it, attach proof of ownership (PDF or image, up to 5 MB). Copyright complaints are reviewed separately, and we normally remove only the disputed content — not the whole listing.</p>
    ),
  },
  {
    id: 'review',
    title: 'How we review requests',
    body: (
      <ul>
        <li><strong>Nothing changes automatically.</strong> A member of our team reviews every request.</li>
        <li><strong>Unlisting:</strong> we first confirm the request comes from the owner or an authorised representative — usually by calling the number on the listing. Once confirmed, the listing is removed from search results, category pages and our sitemap. Search engines may take a few weeks to update their own results.</li>
        <li><strong>Copyright:</strong> we check the complaint and remove or replace the disputed content.</li>
        <li>We e-mail you when your request is approved or not approved.</li>
        <li>Your contact details are only seen by the WedMangal team and are never shown on the website.</li>
      </ul>
    ),
  },
];

function StatusCheck() {
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ step: 'idle' }); // idle | checking | found | error

  const check = async (e) => {
    e.preventDefault();
    if (!reference.trim() || !email.trim()) {
      setState({ step: 'error', message: 'Enter your reference number and the e-mail address you used.' });
      return;
    }
    setState({ step: 'checking' });
    const { ok, status, data } = await postJSON('/api/removal-requests/status/',
      { reference: reference.trim(), email: email.trim() });
    if (ok) setState({ step: 'found', data });
    else if (status === 404) setState({ step: 'error', message: 'No request matches this reference number and e-mail address.' });
    else if (status === 429) setState({ step: 'error', message: 'Too many checks from this connection. Please try again later.' });
    else setState({ step: 'error', message: 'We couldn’t check right now. Please try again.' });
  };

  return (
    <form className="rrp-card rrp-status" onSubmit={check} noValidate>
      <h2 className="rrp-h2">Check the status of a request</h2>
      <div className="rrp-status-fields">
        <label className="rrp-label">
          Reference number
          <input className="rrp-input" value={reference} onChange={e => setReference(e.target.value)}
            placeholder="RR-XXXXXXXX" maxLength={16} autoCapitalize="characters" />
        </label>
        <label className="rrp-label">
          E-mail address
          <input className="rrp-input" type="email" inputMode="email" value={email}
            onChange={e => setEmail(e.target.value)} autoComplete="email" maxLength={254} />
        </label>
      </div>
      <button type="submit" className="rrp-btn" disabled={state.step === 'checking'}>
        {state.step === 'checking' ? 'Checking…' : 'Check status'}
      </button>
      <div aria-live="polite">
        {state.step === 'error' && <p className="rrp-error" role="alert">{state.message}</p>}
        {state.step === 'found' && (
          <dl className="rrp-result">
            <dt>Request</dt><dd>{state.data.reference} — {state.data.request_type_label}</dd>
            <dt>Listing</dt><dd>{state.data.vendor_name}</dd>
            <dt>Status</dt><dd><span className={`rrp-badge rrp-${state.data.status}`}>{state.data.status_label}</span></dd>
            <dt>Submitted</dt><dd>{new Date(state.data.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</dd>
          </dl>
        )}
      </div>
    </form>
  );
}

export default function RemovalRequestScreen() {
  return (
    <div className="rrp-page">
      <Helmet>
        <title>Remove or report a listing | WedMangal</title>
        <meta name="description" content="How business owners can ask WedMangal to remove a listing, report incorrect information or report a photo or copyright concern, and how we review requests." />
        <link rel="canonical" href="https://www.wedmangal.com/removal-request" />
      </Helmet>

      <div className="rrp-header">
        <h1 className="rrp-title">Remove or report a listing</h1>
        <p className="rrp-sub">For business owners, their representatives and content owners.</p>
      </div>

      <nav className="rrp-toc" aria-label="On this page">
        {SECTIONS.map(s => <a key={s.id} href={`#${s.id}`}>{s.title}</a>)}
        <a href="#status">Check the status of a request</a>
      </nav>

      {SECTIONS.map(s => (
        <section key={s.id} id={s.id} className="rrp-card" aria-labelledby={`${s.id}-h`}>
          <h2 className="rrp-h2" id={`${s.id}-h`}>{s.title}</h2>
          {s.body}
        </section>
      ))}

      <div id="status"><StatusCheck /></div>

      <p className="rrp-contact">Can’t find the listing, or need help? <a href="/ContactUs">Contact us</a>.</p>
    </div>
  );
}
