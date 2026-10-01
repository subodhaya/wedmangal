import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import QuoteModal from './QuoteModal';

const vendor = { _id: 42, name: 'Lotus Hall' };

const respond = (status, body) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

const fill = ({ name = 'Priya', phone = '98765 43210', consent = true } = {}) => {
  fireEvent.change(screen.getByLabelText(/^your name/i), { target: { value: name } });
  fireEvent.change(screen.getByLabelText(/^mobile number/i), { target: { value: phone } });
  if (consent) fireEvent.click(screen.getByRole('checkbox'));
};
const submit = () => fireEvent.click(screen.getByRole('button', { name: /send enquiry/i }));

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn(() => respond(201, { id: 1 }));
});

it('requires a phone number before submitting', () => {
  render(<QuoteModal vendor={vendor} onClose={() => {}} />);
  fill({ phone: '' });
  submit();
  expect(screen.getByText('Phone number is required.')).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

it('rejects an invalid phone number', () => {
  render(<QuoteModal vendor={vendor} onClose={() => {}} />);
  fill({ phone: '12345' });
  submit();
  expect(screen.getByText('Enter a valid 10-digit Indian mobile number.')).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

it('requires name and consent', () => {
  render(<QuoteModal vendor={vendor} onClose={() => {}} />);
  fill({ name: ' ', consent: false });
  submit();
  expect(screen.getByText('Please enter your name.')).toBeInTheDocument();
  expect(screen.getByText(/agree to share your details/i)).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

it('submits a valid enquiry and shows confirmation', async () => {
  render(<QuoteModal vendor={vendor} onClose={() => {}} />);
  fill();
  submit();
  expect(await screen.findByText('Enquiry received')).toBeInTheDocument();
  const [url, options] = global.fetch.mock.calls[0];
  expect(url).toMatch(/\/api\/analytics\/quotes\/$/);
  expect(JSON.parse(options.body)).toMatchObject({ vendor_id: 42, name: 'Priya', phone: '98765 43210', consent: true });
});

it('shows server-side validation errors', async () => {
  global.fetch = jest.fn(() => respond(400, { errors: { phone: 'Enter a valid 10-digit Indian mobile number.' } }));
  render(<QuoteModal vendor={vendor} onClose={() => {}} />);
  fill({ phone: '9876543210' });
  submit();
  expect(await screen.findByText('Enter a valid 10-digit Indian mobile number.')).toBeInTheDocument();
  expect(screen.queryByText('Enquiry received')).not.toBeInTheDocument();
});

it('keeps the form and explains when the network fails', async () => {
  global.fetch = jest.fn(() => Promise.reject(new TypeError('Failed to fetch')));
  render(<QuoteModal vendor={vendor} onClose={() => {}} />);
  fill();
  submit();
  expect(await screen.findByText(/couldn’t send your enquiry/i)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('button', { name: /send enquiry/i })).toBeEnabled());
  expect(screen.getByLabelText(/^mobile number/i)).toHaveValue('98765 43210');
});
