import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VendorResultCard, { priceText } from './VendorResultCard';

const vendor = {
  _id: 7, name: 'Lotus Studio', category_label: 'Photographers', area_name: 'Anna Nagar', city: 'Chennai',
  image: 'lotus.jpg', rating: 4.8, google_reviews: 87, price_from: null, price_to: null,
  business_phone: '9876543210', is_available_today: false,
};

const renderCard = (v = vendor) => render(<MemoryRouter><VendorResultCard vendor={v} position={3} query="photographer" /></MemoryRouter>);
const sent = () => global.fetch.mock.calls.map(c => JSON.parse(c[1].body));

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({}) }));
});

it('shows what a customer needs at a glance', () => {
  renderCard();
  expect(screen.getByText('Lotus Studio')).toBeInTheDocument();
  expect(screen.getByText('Photographers · Anna Nagar')).toBeInTheDocument();
  expect(screen.getByText('★ 4.8')).toBeInTheDocument();
  expect(screen.getByText(/87 Google reviews/)).toBeInTheDocument();
  expect(screen.getByText('Price on request')).toBeInTheDocument();  // no invented prices
});

it('opens the profile with a search referral and tracks the click position', () => {
  renderCard();
  const link = screen.getByRole('link', { name: 'View profile' });
  expect(link).toHaveAttribute('href', '/product/7?ref=search');
  fireEvent.click(link);
  expect(sent()[0]).toMatchObject({ event_type: 'search_result_click', vendor_id: 7, source: 'search_results',
    metadata: { position: 3, query: 'photographer' } });
});

it('call and WhatsApp use the business number and still work if analytics fails', () => {
  global.fetch = jest.fn(() => { throw new Error('analytics down'); });
  renderCard();
  const call = screen.getByRole('link', { name: 'Call Lotus Studio' });
  const wa = screen.getByRole('link', { name: 'WhatsApp Lotus Studio' });
  expect(call).toHaveAttribute('href', 'tel:919876543210');
  expect(wa.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/919876543210\?text=/);
  expect(fireEvent.click(call)).toBe(true);   // default action not prevented
  expect(fireEvent.click(wa)).toBe(true);
});

it('tracks phone and WhatsApp clicks from search results', () => {
  renderCard();
  fireEvent.click(screen.getByRole('link', { name: 'Call Lotus Studio' }));
  fireEvent.click(screen.getByRole('link', { name: 'WhatsApp Lotus Studio' }));
  expect(sent().map(b => [b.event_type, b.source])).toEqual([['phone_click', 'search_results'], ['whatsapp_click', 'search_results']]);
});

it('hides contact buttons when there is no business phone', () => {
  renderCard({ ...vendor, business_phone: '' });
  expect(screen.queryByRole('link', { name: /Call/ })).not.toBeInTheDocument();
});

it('formats real prices only', () => {
  expect(priceText(null, null)).toBe('Price on request');
  expect(priceText(40000, 75000)).toBe('₹40,000–₹75,000');
  expect(priceText(150000, null)).toBe('From ₹1,50,000');
});
