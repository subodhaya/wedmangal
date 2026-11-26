import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import api from '../utils/api';
import DeleteAccountScreen from './DeleteAccountScreen';

jest.mock('../utils/api', () => ({ __esModule: true, default: { post: jest.fn() }, BASE_URL: '' }));

const show = () => render(<HelmetProvider><MemoryRouter><DeleteAccountScreen /></MemoryRouter></HelmetProvider>);
const originalLocation = window.location;

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); api.post.mockReset();
  delete window.location;
  window.location = { replace: jest.fn() };
});
afterAll(() => { window.location = originalLocation; });

it('explains deletion to everyone and asks visitors to log in', () => {
  show();
  expect(screen.getByText('What is erased')).toBeTruthy();
  expect(screen.getByText('Log in to delete').getAttribute('href')).toBe('/login?redirect=/delete-account');
  expect(screen.queryByText('Delete my account', { selector: 'button' })).toBeNull();
});

it('deletes only after DELETE is typed, then clears the device but keeps the city', async () => {
  localStorage.setItem('userInfo', JSON.stringify({ token: 't', name: 'Asha', email: 'a@example.com' }));
  localStorage.setItem('cartItems', '[1]');
  localStorage.setItem('wm_city', 'Chennai');
  api.post.mockResolvedValue({ data: {} });
  show();
  const button = screen.getByText('Delete my account', { selector: 'button' });
  expect(button.disabled).toBe(true);
  fireEvent.change(screen.getByLabelText(/Type DELETE/), { target: { value: 'DELETE' } });
  fireEvent.click(button);
  await waitFor(() => expect(window.location.replace).toHaveBeenCalledWith('/delete-account'));
  expect(api.post).toHaveBeenCalledWith('/api/users/delete-account/', { confirm: 'DELETE' });
  expect([localStorage.getItem('userInfo'), localStorage.getItem('cartItems'), localStorage.getItem('wm_city')]).toEqual([null, null, 'Chennai']);
});

it('keeps the login and shows the reason when the server refuses', async () => {
  localStorage.setItem('userInfo', JSON.stringify({ token: 't', name: 'Boss' }));
  api.post.mockRejectedValue({ response: { data: { detail: 'Team accounts can’t be deleted here.' } } });
  show();
  fireEvent.change(screen.getByLabelText(/Type DELETE/), { target: { value: 'DELETE' } });
  fireEvent.click(screen.getByText('Delete my account', { selector: 'button' }));
  expect((await screen.findByRole('alert')).textContent).toMatch('Team accounts');
  expect(localStorage.getItem('userInfo')).not.toBeNull();
});
