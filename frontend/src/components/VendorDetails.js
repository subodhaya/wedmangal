// Category details the business has actually given (capacity, parking, food, ...).
// Questions nobody has answered are not sent by the API and are never shown as "No".
import React from 'react';
import './VendorDetails.css';

const ICONS = {
  capacity: '👥', hall_type: '🏛️', ac: '❄️', parking: '🚗', food_type: '🍛', in_house_catering: '🍽️',
  outside_catering: '🧑‍🍳', rooms: '🛏️', cuisine: '🥘', min_plates: '🍽️', shoot_type: '📸',
  video_included: '🎥', drone: '🚁', type: '✨', trial_available: '🪞', home_visit: '🏠',
  venue_type: '🎵', equipment_included: '🔊', stage_decoration: '🎭', flower_decoration: '💐',
};

const TITLES = {
  halls: 'Venue details', caterers: 'Catering details', photographers: 'Photography details',
  makeup_artist: 'Makeup details', mehandi_artist: 'Mehandi details', dj_artist: 'DJ details',
  decorators: 'Decoration details',
};

export const detailsTitle = (category) => TITLES[(category || '').toLowerCase()] || 'Details';

export default function VendorDetails({ details, category }) {
  if (!details || details.length === 0) return null;
  return (
    <section className="vp-section vd" aria-labelledby="vd-title">
      <h2 className="vp-h2" id="vd-title">{detailsTitle(category)}</h2>
      <dl className="vd-grid">
        {details.map(d => (
          <div className={`vd-item ${d.value === false ? 'vd-no' : ''}`} key={d.key}>
            <span className="vd-icon" aria-hidden="true">{ICONS[d.key] || '•'}</span>
            <dt>{d.label}</dt>
            <dd>{d.display}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
