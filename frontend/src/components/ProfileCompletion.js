// Profile completeness checklist + category-specific details for a vendor's own listing.
// Every question can be left "Not specified": that is stored as unknown, never as "No".
import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import './ProfileCompletion.css';

const SOURCE_LABELS = { vendor: 'Added by you', admin: 'Added by WedMangal', imported: 'From the original listing' };

const toForm = (fields, attributes) =>
  Object.fromEntries(fields.map(f => {
    const v = attributes[f.key];
    if (v === undefined || v === null) return [f.key, ''];
    if (f.type === 'yes_no') return [f.key, v ? 'yes' : 'no'];
    return [f.key, String(v)];
  }));

const fromForm = (fields, form) =>
  Object.fromEntries(fields.map(f => {
    const v = (form[f.key] ?? '').trim();
    if (v === '') return [f.key, null];                       // unknown → removed, not False/0
    if (f.type === 'yes_no') return [f.key, v === 'yes'];
    return [f.key, v];
  }));

export default function ProfileCompletion({ vendorId }) {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    api.get(`/api/vendors/${vendorId}/profile/`)
      .then(({ data }) => { if (live) { setProfile(data); setForm(toForm(data.fields, data.attributes)); } })
      .catch(() => { if (live) setProfile(false); });
    return () => { live = false; };
  }, [vendorId]);

  if (!profile) return null;   // loading, or this account doesn't manage the listing

  const { completeness, fields, sources } = profile;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      const { data } = await api.patch(`/api/vendors/${vendorId}/profile/`, { attributes: fromForm(fields, form) });
      setProfile(data);
      setForm(toForm(data.fields, data.attributes));
      setMessage(data.changed?.length ? 'Details saved.' : 'Nothing changed.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const input = (f) => {
    const id = `pcomp-${f.key}`;
    const common = { id, value: form[f.key] ?? '', onChange: e => setForm({ ...form, [f.key]: e.target.value }) };
    if (f.type === 'yes_no') {
      return (
        <select {...common} className="pcomp-input">
          <option value="">Not specified</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      );
    }
    if (f.type === 'choice') {
      return (
        <select {...common} className="pcomp-input">
          <option value="">Not specified</option>
          {f.choices.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      );
    }
    if (f.type === 'number') {
      return <input {...common} className="pcomp-input" type="number" min={f.min} max={f.max} inputMode="numeric"
        placeholder="Not specified" />;
    }
    return <input {...common} className="pcomp-input" type="text" maxLength={f.max_length} placeholder="Not specified" />;
  };

  return (
    <section className="pcomp-card" aria-labelledby="pcomp-title">
      <div className="pcomp-head">
        <h2 id="pcomp-title" className="pcomp-title">Profile completeness</h2>
        <span className="pcomp-percent">{completeness.percent}%</span>
      </div>
      <div className="pcomp-bar" role="progressbar" aria-valuenow={completeness.percent} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${completeness.percent}%` }} />
      </div>
      <ul className="pcomp-checklist">
        {completeness.checklist.map(item => (
          <li key={item.key} className={item.done ? 'done' : ''}>
            <span aria-hidden="true">{item.done ? '✓' : '○'}</span> {item.label}
          </li>
        ))}
      </ul>
      <p className="pcomp-note">Basic details, photos and prices are edited in the form below.</p>

      {fields.length > 0 && (
        <form className="pcomp-form" onSubmit={save}>
          <h3 className="pcomp-subtitle">{(profile.category || '').replace(/_/g, ' ')} details</h3>
          <p className="pcomp-note">Customers see only what you fill in. Leave anything you're unsure about as “Not specified”.</p>
          <div className="pcomp-grid">
            {fields.map(f => (
              <div className="pcomp-field" key={f.key}>
                <label htmlFor={`pcomp-${f.key}`}>{f.label}</label>
                {input(f)}
                {form[f.key] !== '' && sources[`attributes.${f.key}`] && (
                  <small className="pcomp-source">{SOURCE_LABELS[sources[`attributes.${f.key}`]]}</small>
                )}
              </div>
            ))}
          </div>
          {error && <p className="pcomp-error">⚠ {error}</p>}
          {message && <p className="pcomp-ok">{message}</p>}
          <button type="submit" className="pcomp-save" disabled={saving}>{saving ? 'Saving…' : 'Save details'}</button>
        </form>
      )}
    </section>
  );
}
