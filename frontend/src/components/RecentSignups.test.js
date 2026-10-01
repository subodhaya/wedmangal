import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RecentSignups from './RecentSignups';
import api from '../utils/api';

jest.mock('../utils/api', () => ({ __esModule: true, default: { get: jest.fn() }, BASE_URL: '' }));

const renderPanel = () => render(<MemoryRouter><RecentSignups /></MemoryRouter>);

it('lists the newest users first with sign-up counts', async () => {
  api.get.mockResolvedValue({ data: {
    counts: { last_7_days: 3, this_month: 5, total: 814 },
    users: [
      { id: 2, name: 'Priya K', username: 'priya', email: 'p@example.com', role: 'customer', is_staff: false, phone_linked: true, date_joined: '2026-10-01T18:40:00Z' },
      { id: 1, name: '', username: 'oldvendor', email: '', role: 'service-owner', is_staff: false, phone_linked: false, date_joined: '2026-09-01T10:00:00Z' },
    ],
  } });
  renderPanel();
  expect(await screen.findByText('Priya K')).toBeInTheDocument();
  const names = screen.getAllByRole('listitem').map(li => li.textContent);
  expect(names[0]).toMatch(/^Priya K/);
  expect(names[1]).toMatch(/^oldvendor/);
  expect(screen.getByText(/3 in the last 7 days · 5 this month · 814 total/)).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith('/api/analytics/recent-signups/', { params: { limit: 10 } });
});

it('renders nothing for non-admins', async () => {
  api.get.mockRejectedValue({ response: { status: 403 } });
  const { container } = renderPanel();
  await waitFor(() => expect(container).toBeEmptyDOMElement());
});
