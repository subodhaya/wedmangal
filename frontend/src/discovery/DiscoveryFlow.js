// Quick questions → structured requirement → matching vendors (existing search).
// Loaded only when a visitor taps "Help me find vendors", so the vendor page stays light.
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackEvent, EVENTS } from '../utils/analytics';
import { AREA_CHOICES, answersToRequirement, questionSet, requirementChips, requirementToParams } from './requirements';
import './Discovery.css';

const STORE = 'wm_discovery_answers';
const load = (category) => {
  try { const s = JSON.parse(sessionStorage.getItem(STORE)); return s && s.category === category ? s.answers : null; }
  catch { return null; }
};
const save = (category, answers) => { try { sessionStorage.setItem(STORE, JSON.stringify({ category, answers })); } catch { /* ignore */ } };

export default function DiscoveryFlow({ category, sourceVendorId, sourceArea, initialAnswers, onClose, onDone }) {
  const set = questionSet(category);
  const navigate = useNavigate();
  const [answers, setAnswers] = useState(() => initialAnswers || load(category) || {});
  const [step, setStep] = useState(0);
  const [otherArea, setOtherArea] = useState(answers.location?.other || '');
  const panelRef = useRef(null);
  const total = set.questions.length;
  const q = set.questions[step];
  const done = step >= total;

  useEffect(() => { save(category, answers); }, [category, answers]);
  useEffect(() => { panelRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }); }, [step]);

  const track = (type, metadata) => trackEvent(type, { vendorId: sourceVendorId, source: 'discovery', metadata: { category: category || '', ...metadata } });

  const answer = (id, value, advance = true) => {
    setAnswers(a => ({ ...a, [id]: value }));
    const shown = typeof value === 'object' && value !== null
      ? (Array.isArray(value) ? value.join(',') : value.area || value.other || (value.anywhere && 'anywhere') || '') : String(value);
    track(EVENTS.DISCOVERY_QUESTION_ANSWERED, { question: id, answer: shown.slice(0, 100), step: step + 1 });
    if (advance) next();
  };
  const next = () => setStep(s => {
    const n = s + 1;
    if (n === total) track(EVENTS.DISCOVERY_COMPLETED, { step: total });
    return n;
  });
  const toggle = (id) => setAnswers(a => {
    const cur = a.important || [];
    return { ...a, important: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] };
  });

  const requirement = answersToRequirement(category, answers);
  const findVendors = () => {
    const params = requirementToParams(requirement, sourceVendorId);
    if (onDone) onDone(params);
    else navigate(`/search/?${params.toString()}`);
  };

  const areas = sourceArea && !AREA_CHOICES.includes(sourceArea) ? [sourceArea, ...AREA_CHOICES] : AREA_CHOICES;
  const chip = (selected, label, onClick, key) => (
    <button type="button" key={key || label} className={`dsc-chip${selected ? ' dsc-chip-on' : ''}`} aria-pressed={selected} onClick={onClick}>
      {label}
    </button>
  );

  return (
    <div className="dsc-flow" ref={panelRef}>
      <div className="dsc-top">
        <span className="dsc-progress-text">{done ? 'Your requirements' : `Question ${step + 1} of ${total}`}</span>
        {onClose && <button type="button" className="dsc-link" onClick={onClose}>Close</button>}
      </div>
      <div className="dsc-progress" aria-hidden="true"><span style={{ width: `${(Math.min(step, total) / total) * 100}%` }} /></div>

      {!done && q.type === 'location' && (
        <fieldset className="dsc-q">
          <legend>{q.title}</legend>
          <div className="dsc-chips">
            {areas.map(a => chip(answers.location?.area === a, a, () => answer('location', { area: a }), a))}
            {chip(!!answers.location?.anywhere, 'Anywhere in Chennai', () => answer('location', { anywhere: true }))}
          </div>
          <form className="dsc-other" onSubmit={e => { e.preventDefault(); if (otherArea.trim()) answer('location', { other: otherArea.trim() }); }}>
            <label htmlFor="dsc-other-area">Somewhere else?</label>
            <div>
              <input id="dsc-other-area" value={otherArea} maxLength={60} placeholder="Type an area"
                onChange={e => setOtherArea(e.target.value)} />
              <button type="submit" className="dsc-small" disabled={!otherArea.trim()}>OK</button>
            </div>
          </form>
        </fieldset>
      )}

      {!done && q.type === 'single' && (
        <fieldset className="dsc-q">
          <legend>{q.title}</legend>
          <div className="dsc-chips">
            {q.options.map(o => chip(answers[q.id] === o.id, o.label, () => answer(q.id, o.id), o.id))}
          </div>
        </fieldset>
      )}

      {!done && q.type === 'multi' && (
        <fieldset className="dsc-q">
          <legend>{q.title}</legend>
          {q.hint && <p className="dsc-hint">{q.hint}</p>}
          <div className="dsc-chips">
            {q.options.map(o => chip((answers.important || []).includes(o.id), o.label, () => toggle(o.id), o.id))}
          </div>
          {q.avoid && (
            <>
              <p className="dsc-sub">Rather not have</p>
              <div className="dsc-chips">
                {q.avoid.map(o => chip((answers.important || []).includes(o.id), o.label, () => toggle(o.id), o.id))}
              </div>
            </>
          )}
          <button type="button" className="dsc-primary" onClick={() => answer('important', answers.important || [])}>Next</button>
        </fieldset>
      )}

      {done && (
        <div className="dsc-q">
          <p className="dsc-summary-title">We’ll look for {set.noun} with:</p>
          <div className="dsc-chips dsc-summary">
            {requirementChips(requirement).map(c => <span key={c} className="dsc-tag">{c}</span>)}
          </div>
          <button type="button" className="dsc-primary" onClick={findVendors}>Show matching {set.noun}</button>
        </div>
      )}

      <div className="dsc-nav">
        {step > 0 && <button type="button" className="dsc-link" onClick={() => setStep(s => s - 1)}>← Back</button>}
        {!done && q.optional && q.type !== 'multi' && (
          <button type="button" className="dsc-link dsc-skip" onClick={next}>Skip</button>
        )}
        {!done && !q.optional && q.type !== 'multi' && answers[q.id] != null && (
          <button type="button" className="dsc-link dsc-skip" onClick={next}>Next →</button>
        )}
      </div>
    </div>
  );
}
