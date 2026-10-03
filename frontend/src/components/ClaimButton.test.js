import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import api from '../utils/api';
import ClaimButton from './ClaimButton';

jest.mock('../utils/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const product = { _id: 7, name: 'Lotus Hall', city: 'Chennai', listing_status: 'unclaimed' };
const state = (extra) => ({ data: { vendor_id: 7, listing_status: 'unclaimed', logged_in: true, can_manage: false,
  claim_pending: false, blocked: null, sms_blocked: null, listed_mobile: '+91 98••••••10', ...extra } });

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.setItem('userInfo', JSON.stringify({ token: 'x' }));
});

it('never shows Verified for a merely claimed listing', () => {
  localStorage.clear();
  render(<ClaimButton product={{ ...product, listing_status: 'claimed' }} />);
  expect(screen.getByText('✓ Claimed by the business')).toBeInTheDocument();
  expect(screen.queryByText(/verified/i)).not.toBeInTheDocument();
});

it('shows Verified only when the listing is verified', () => {
  localStorage.clear();
  render(<ClaimButton product={{ ...product, listing_status: 'verified' }} />);
  expect(screen.getByText('✓ Verified by WedMangal')).toBeInTheDocument();
});

it('claims with a code sent to the listed number — the user never types that number', async () => {
  api.get.mockResolvedValue(state());
  api.post.mockImplementation((url) => Promise.resolve({ data: url.endsWith('send-code/')
    ? { listed_mobile: '+91 98••••••10' } : { listing_status: 'claimed', user: { token: 'new' } } }));
  render(<ClaimButton product={product} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Claim this listing' }));
  expect(screen.getByText(/claim your/i)).toHaveTextContent('Claim your free WedMangal listing');
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByText('+91 98••••••10')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
  fireEvent.change(await screen.findByLabelText('6-digit code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm and claim' }));
  expect(await screen.findByText('You now manage this listing')).toBeInTheDocument();
  expect(api.post).toHaveBeenCalledWith('/api/vendors/7/claim/send-code/');
  expect(api.post).toHaveBeenCalledWith('/api/vendors/7/claim/verify/', { code: '123456' });
  expect(JSON.parse(localStorage.getItem('userInfo')).token).toBe('new');
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.getByText('✓ You manage this listing')).toBeInTheDocument();
});

it('offers an admin-reviewed request when the listing has no mobile', async () => {
  api.get.mockResolvedValue(state({ sms_blocked: 'no_listed_mobile', listed_mobile: '' }));
  api.post.mockResolvedValue({ data: { claim_pending: true } });
  render(<ClaimButton product={product} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Claim this listing' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.queryByRole('button', { name: 'Send code' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Your mobile number'), { target: { value: '9111111111' } });
  fireEvent.change(screen.getByLabelText(/how are you connected/i), { target: { value: 'I am the owner of this hall' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send claim request' }));
  expect(await screen.findByText('Request sent')).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[1]);
  expect(screen.getByText(/being reviewed by WedMangal/)).toBeInTheDocument();
  expect(api.post).toHaveBeenCalledWith('/api/vendors/7/claim/request/',
    { phone: '9111111111', message: 'I am the owner of this hall' });
});

it('shows a pending claim instead of the claim button', async () => {
  api.get.mockResolvedValue(state({ claim_pending: true }));
  render(<ClaimButton product={product} />);
  expect(await screen.findByText(/being reviewed by WedMangal/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Claim this listing' })).not.toBeInTheDocument();
});

it('explains why to claim before asking a logged-out visitor to log in', () => {
  localStorage.clear();
  render(<ClaimButton product={product} />);
  fireEvent.click(screen.getByRole('button', { name: 'Claim this listing' }));
  for (const text of ['Correct your business information', 'Add photos and your services',
    'Receive customer enquiries through WedMangal']) {
    expect(screen.getByText(text)).toBeInTheDocument();
  }
  expect(screen.getByText(/Claiming is free/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Log in or sign up to claim' }))
    .toHaveAttribute('href', '/login?redirect=%2Fproduct%2F7%3Fclaim%3D1');
  expect(api.get).not.toHaveBeenCalled();
});

it('reopens the claim dialog after logging in', async () => {
  window.history.pushState({}, '', '/product/7?claim=1');
  api.get.mockResolvedValue(state());
  render(<ClaimButton product={product} />);
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
  window.history.pushState({}, '', '/');
});

it('can leave the status to the page header', () => {
  localStorage.clear();
  const { container } = render(<ClaimButton product={{ ...product, listing_status: 'claimed' }} hideStatus />);
  expect(container).toBeEmptyDOMElement();
});
