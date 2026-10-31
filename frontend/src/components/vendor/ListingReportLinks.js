// Quiet links at the bottom of a vendor page: report incorrect information, report a photo or
// copyright concern, request to unlist. The claim link sits just above (ClaimButton).
import React, { Suspense, lazy, useState } from 'react';
import '../RemovalRequestModal.css';

const RemovalRequestModal = lazy(() => import('../RemovalRequestModal'));

const LINKS = [
  ['incorrect_information', 'Report incorrect information'],
  ['copyright', 'Report a photo or copyright concern'],
  ['unlist', 'Request to unlist this business'],
];

export default function ListingReportLinks({ vendor }) {
  const [open, setOpen] = useState(null);
  return (
    <>
      <ul className="vp-report-links" aria-label="About this listing">
        {LINKS.map(([type, label]) => (
          <li key={type}>
            <button type="button" className="vp-report-link" onClick={() => setOpen(type)}>{label}</button>
          </li>
        ))}
      </ul>
      {open && (
        <Suspense fallback={null}>
          <RemovalRequestModal vendor={vendor} type={open} onClose={() => setOpen(null)} />
        </Suspense>
      )}
    </>
  );
}
