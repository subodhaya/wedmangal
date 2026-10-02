import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import SearchResultScreen from './SearchResultScreen';
import api from '../utils/api';

jest.mock('../utils/api', () => ({ __esModule: true, default: { get: jest.fn() }, BASE_URL: '' }));

const options = { categories: [{ key: 'Photographers', label: 'Photographers' }, { key: 'Halls', label: 'Wedding Halls & Venues' }], ratings: [4, 4.5], sorts: ['relevance', 'rating', 'newest'] };
const card = (id, name) => ({ _id: id, name, category_label: 'Photographers', area_name: 'Adyar', city: 'Chennai', image: '', rating: 4.6, google_reviews: 50, price_from: null, price_to: null, business_phone: '9876543210' });

const results = {
  query: 'photographer in Chennai under 50000', count: 2, page: 1, pages: 1,
  interpreted: { category: 'Photographers', city: 'Chennai', budget_max: 50000, category_label: 'Photographers' },
  applied: { category: 'Photographers', area: null, min_rating: null, sort: 'relevance' },
  notes: ['We noted your budget (under ₹50,000), but most vendors haven’t listed prices yet, so results aren’t filtered by price.'],
  suggestions: [], results: [card(1, 'Lotus Studio'), card(2, 'Pixel Weddings')], options,
};

const renderAt = (url) => render(
  <HelmetProvider>
    <MemoryRouter initialEntries={[url]}>
      <Routes><Route path="/search/" element={<SearchResultScreen />} /></Routes>
    </MemoryRouter>
  </HelmetProvider>
);

beforeEach(() => {
  localStorage.clear();
  jest.useFakeTimers();
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({}) }));
  api.get.mockReset();
});
afterEach(() => jest.useRealTimers());

it('shows understood search, honest notes and results', async () => {
  api.get.mockResolvedValue({ data: results });
  renderAt('/search/?q=photographer%20in%20Chennai%20under%2050000');
  expect(await screen.findByRole('heading', { level: 1, name: 'Photographers in Chennai' })).toBeInTheDocument();
  expect(screen.getByText('“photographer in Chennai under 50000”')).toBeInTheDocument();
  expect(screen.getByText(/vendors found/)).toHaveTextContent('2 vendors found');
  expect(screen.getByText('Budget under ₹50,000')).toBeInTheDocument();
  expect(screen.getByText(/aren’t filtered by price/)).toBeInTheDocument();
  expect(screen.getByText('Lotus Studio')).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith('/api/search/', { params: expect.objectContaining({ q: 'photographer in Chennai under 50000', page: 1 }) });
});

it('records the search in search-intent analytics with the result count', async () => {
  api.get.mockResolvedValue({ data: results });
  renderAt('/search/?q=photographer');
  await screen.findByText('Lotus Studio');
  jest.advanceTimersByTime(1000);
  const body = JSON.parse(global.fetch.mock.calls.find(c => c[0].endsWith('/api/analytics/searches/'))[1].body);
  expect(body).toMatchObject({ source: 'search_page', query: 'photographer', result_count: 2 });
});

it('applying a filter updates the search', async () => {
  api.get.mockResolvedValue({ data: results });
  renderAt('/search/?q=photographer');
  await screen.findByText('Lotus Studio');
  fireEvent.click(screen.getByLabelText('4.5+ ★'));
  await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/api/search/',
    { params: expect.objectContaining({ q: 'photographer', min_rating: '4.5', page: 1 }) }));
});

it('supports the old ?vendor= URL format', async () => {
  api.get.mockResolvedValue({ data: results });
  renderAt('/search/?city=Chennai&vendor=Photographers');
  await screen.findByText('Lotus Studio');
  expect(api.get).toHaveBeenCalledWith('/api/search/', { params: expect.objectContaining({ category: 'Photographers' }) });
});

it('empty results explain and offer real alternatives', async () => {
  api.get.mockResolvedValue({ data: { ...results, count: 0, pages: 1, results: [], notes: [],
    applied: { category: 'Halls', area: 'Tambaram', min_rating: null, sort: 'relevance' },
    suggestions: [{ label: 'Show all Wedding Halls & Venues in Chennai', remove: 'area', count: 120 }] } });
  renderAt('/search/?category=Halls&area=Tambaram');
  expect(await screen.findByText('No exact matches found')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Show all Wedding Halls & Venues in Chennai (120)' }));
  await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/api/search/',
    { params: expect.objectContaining({ category: 'Halls', area: '' }) }));
});

it('shows a friendly error if search is down', async () => {
  api.get.mockRejectedValue(new Error('network'));
  renderAt('/search/?q=hall');
  expect(await screen.findByRole('alert')).toHaveTextContent('Search is unavailable right now');
});
