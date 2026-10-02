import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import api from '../utils/api';
import ProfileCompletion from './ProfileCompletion';

jest.mock('../utils/api', () => ({ __esModule: true, default: { get: jest.fn(), patch: jest.fn() } }));

const profile = {
  vendor_id: 7, category: 'Halls',
  fields: [
    { key: 'capacity', label: 'Seating capacity (guests)', type: 'number', min: 10, max: 20000 },
    { key: 'parking', label: 'Parking available', type: 'yes_no' },
    { key: 'ac', label: 'Air-conditioned', type: 'yes_no' },
  ],
  attributes: { parking: true },
  sources: { 'attributes.parking': 'vendor', 'attributes.capacity': 'unknown', 'attributes.ac': 'unknown' },
  completeness: { percent: 50, checklist: [{ key: 'description', label: 'A description', done: true },
                                           { key: 'pricing', label: 'A price', done: false }] },
};

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockResolvedValue({ data: profile });
  api.patch.mockResolvedValue({ data: { ...profile, changed: ['capacity'] } });
});

it('shows the checklist and unanswered questions as Not specified', async () => {
  render(<ProfileCompletion vendorId={7} />);
  expect(await screen.findByText('50%')).toBeInTheDocument();
  expect(screen.getByLabelText('Parking available')).toHaveValue('yes');
  expect(screen.getByLabelText('Air-conditioned')).toHaveValue('');
  expect(screen.getByText('Added by you')).toBeInTheDocument();
});

it('saves unknown answers as null, never as false or 0', async () => {
  render(<ProfileCompletion vendorId={7} />);
  fireEvent.change(await screen.findByLabelText('Seating capacity (guests)'), { target: { value: '600' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save details' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalled());
  expect(api.patch.mock.calls[0][1]).toEqual({ attributes: { capacity: '600', parking: true, ac: null } });
  expect(await screen.findByText('Details saved.')).toBeInTheDocument();
});

it('renders nothing for an account that does not manage the listing', async () => {
  api.get.mockRejectedValue({ response: { status: 403 } });
  const { container } = render(<ProfileCompletion vendorId={7} />);
  await waitFor(() => expect(api.get).toHaveBeenCalled());
  expect(container).toBeEmptyDOMElement();
});
