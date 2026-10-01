import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import SearchIntentSummary from './SearchIntentSummary';
import api from '../utils/api';

jest.mock('../utils/api', () => ({ __esModule: true, default: { get: jest.fn() }, BASE_URL: '' }));

const summary = {
  range: 'month',
  total_searches: 420,
  searches_with_intent: 360,
  top_areas: [{ area: 'Tambaram', count: 142 }, { area: 'Porur', count: 97 }],
  top_categories: [{ category: 'Halls', label: 'Halls', count: 300 }],
  capacity_ranges: [{ label: '500–999', count: 40 }, { label: 'Under 100', count: 0 }],
  budget_ranges: [{ label: '₹1–2 lakh', count: 55 }],
  food_preferences: [{ food_preference: 'veg', label: 'Vegetarian', count: 70 }],
  parking: { required: 64, not_required: 3 },
};

it('shows aggregated search intent for admins', async () => {
  api.get.mockResolvedValue({ data: summary });
  render(<SearchIntentSummary />);
  expect(await screen.findByText('Tambaram')).toBeInTheDocument();
  expect(screen.getByText('142 searches')).toBeInTheDocument();
  expect(screen.getByText('Porur')).toBeInTheDocument();
  expect(screen.getByText('₹1–2 lakh')).toBeInTheDocument();
  expect(screen.getByText('Vegetarian')).toBeInTheDocument();
  expect(screen.getByText('64')).toBeInTheDocument();
  expect(screen.queryByText('Under 100')).not.toBeInTheDocument();  // empty buckets hidden
  expect(api.get).toHaveBeenCalledWith('/api/analytics/search-summary/', { params: { range: 'month' } });
});

it('renders nothing for non-admins', async () => {
  api.get.mockRejectedValue({ response: { status: 403 } });
  const { container } = render(<SearchIntentSummary />);
  await waitFor(() => expect(container).toBeEmptyDOMElement());
});
