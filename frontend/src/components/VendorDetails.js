// Category details the business has actually given (capacity, parking, food, ...).
// Questions nobody has answered are not sent by the API and are never shown as "No".
import React from 'react';
import './VendorDetails.css';

export default function VendorDetails({ details }) {
  if (!details || details.length === 0) return null;
  return (
    <div className="ps-info-item vd-wrap">
      <span className="ps-info-icon">📋</span>
      <div className="vd-body">
        <div className="ps-info-label">Details</div>
        <dl className="vd-list">
          {details.map(d => (
            <div className="vd-row" key={d.key}>
              <dt>{d.label}</dt>
              <dd>{d.display}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
