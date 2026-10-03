import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import api from '../utils/api';
import ProductScreen from './ProductScreen';

jest.mock('../utils/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock('../utils/analytics', () => ({ trackEvent: jest.fn(), EVENTS: {} }));

const svc = (id, images) => ({ _id: id, name: `Package ${id}`, price: null, rating: 4.5, numReviews: 5, reviews: [],
  images: images.map((src, i) => ({ _id: `${id}-${i}`, image: src })) });

const vendor = (extra = {}) => ({
  _id: 7, name: 'Green Apple Banquet hall', category: 'Halls', city: 'Chennai', area_name: 'Anna Nagar',
  address: '50, Park Rd, Anna Nagar West Extension, Chennai', business_phone: '917449000333',
  image: '/images/green.jpg', listing_status: 'unclaimed', is_claimed: false,
  description: 'Green Apple is a Halls based in Anna Nagar, Chennai. Rated 4.9★ on Google (5996 reviews). Great hall.',
  about: 'Green Apple is a Halls based in Anna Nagar, Chennai. Great hall.',
  google_rating: { rating: 4.9, reviews: 5996 },
  details: [], services: [svc(1, ['/images/a.jpg', '/images/b.jpg']), svc(2, ['/images/c.jpg', '/images/d.jpg'])],
  videos: [], ...extra,
});

const show = (data) => {
  api.get.mockImplementation((url) => Promise.resolve({ data: url.includes('/bookings/') ? { booked_dates: [] } : data }));
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/product/7']}>
        <Routes><Route path="/product/:id" element={<ProductScreen />} /></Routes>
      </MemoryRouter>
    </HelmetProvider>
  );
};

beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); });

it('leads with the vendor photos, name, location, Google rating and contact actions', async () => {
  show(vendor());
  expect(await screen.findByRole('heading', { level: 1, name: 'Green Apple Banquet hall' })).toBeInTheDocument();
  expect(screen.getByText('Anna Nagar, Chennai')).toBeInTheDocument();
  expect(screen.getByTitle('Rating on Google')).toHaveTextContent('4.9(5,996 Google reviews)');
  expect(screen.getByRole('button', { name: 'View all 5 photos' })).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: /whatsapp/i })[0]).toHaveAttribute('href', expect.stringContaining('wa.me/917449000333'));
  expect(screen.getAllByRole('link', { name: /call/i })[0]).toHaveAttribute('href', 'tel:917449000333');
  expect(screen.getAllByRole('button', { name: /get quote/i }).length).toBeGreaterThan(0);
  // the Google sentence is shown in the header, not repeated in About
  expect(screen.getByText('Green Apple is a Halls based in Anna Nagar, Chennai. Great hall.')).toBeInTheDocument();
});

it('opens every photo in the gallery', async () => {
  show(vendor());
  fireEvent.click(await screen.findByRole('button', { name: 'View all 5 photos' }));
  const dialog = screen.getByRole('dialog', { name: 'All photos' });
  expect(within(dialog).getAllByRole('img')).toHaveLength(5);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close photos' }));
  expect(screen.queryByRole('dialog', { name: 'All photos' })).not.toBeInTheDocument();
});

it('handles one photo', async () => {
  show(vendor({ services: [svc(1, [])] }));
  await screen.findByRole('heading', { level: 1 });
  expect(screen.queryByRole('button', { name: /view all/i })).not.toBeInTheDocument();
  expect(document.querySelector('.vg-count-1')).not.toBeNull();
});

it('handles no photos without a broken image or stock photo', async () => {
  show(vendor({ image: '/images/placeholder.png', services: [svc(1, [])] }));
  await screen.findByRole('heading', { level: 1 });
  expect(document.querySelector('.vg-empty')).toHaveTextContent('GA');
  expect(document.querySelector('.vg img')).toBeNull();
});

it('shows known hall details as a scannable list and leaves unknown ones out', async () => {
  show(vendor({ details: [
    { key: 'capacity', label: 'Seating capacity (guests)', value: 600, display: '600 guests' },
    { key: 'parking', label: 'Parking available', value: true, display: 'Yes' },
    { key: 'ac', label: 'Air-conditioned', value: false, display: 'No' },
  ] }));
  const section = await screen.findByRole('region', { name: 'Venue details' });
  expect(within(section).getByText('600 guests')).toBeInTheDocument();
  expect(within(section).getByText('Parking available')).toBeInTheDocument();
  expect(within(section).getByText('No')).toBeInTheDocument();            // an explicit answer
  expect(within(section).queryByText(/food|rooms/i)).not.toBeInTheDocument();  // never answered → not shown
});

it('shows no details section when nothing is known', async () => {
  show(vendor());
  await screen.findByRole('heading', { level: 1 });
  expect(screen.queryByRole('region', { name: /details/i })).not.toBeInTheDocument();
});

it('distinguishes claimed from verified', async () => {
  const { unmount } = show(vendor({ listing_status: 'claimed', is_claimed: true }));
  expect(await screen.findByText('Claimed by the business')).toBeInTheDocument();
  expect(screen.queryByText(/verified/i)).not.toBeInTheDocument();
  unmount();
  show(vendor({ listing_status: 'verified', is_claimed: true }));
  expect(await screen.findByText('✓ Verified by WedMangal')).toBeInTheDocument();
});

it('does not show the imported placeholder review counts on services', async () => {
  show(vendor());
  await screen.findByRole('heading', { level: 1 });
  expect(screen.queryByText('(5)')).not.toBeInTheDocument();
});
