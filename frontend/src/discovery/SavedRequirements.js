// "Your saved requirements" on the Profile page — each links back to its matching vendors.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { requirementChips, requirementToParams } from './requirements';
import './Discovery.css';

export default function SavedRequirements() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let live = true;
    api.get('/api/discovery/saved/').then(({ data }) => { if (live) setItems(Array.isArray(data) ? data : []); }).catch(() => {});
    return () => { live = false; };
  }, []);
  if (!items.length) return null;
  return (
    <section className="dsc-saved" aria-labelledby="dsc-saved-title">
      <h3 id="dsc-saved-title">Your saved requirements</h3>
      <ul>
        {items.map(item => (
          <li key={item.id}>
            <span className="dsc-saved-cat">{(item.category || 'Vendors').replace(/_/g, ' ')}</span>
            <span className="dsc-saved-chips">{requirementChips(item.requirements).join(' · ')}</span>
            <Link to={`/search/?${requirementToParams(item.requirements).toString()}`}>View matching vendors →</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
