import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import { isAdminUser } from '../utils/auth';

const visit = (path, userInfo) => {
  localStorage.clear();
  if (userInfo) localStorage.setItem('userInfo', JSON.stringify(userInfo));
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<div>HOME</div>} />
        <Route path="/login" element={<div>LOGIN</div>} />
        <Route path="/productlist/" element={<PrivateRoute roles={['admin']} element={<div>ADMIN PAGE</div>} />} />
        <Route path="/vendor-only" element={<PrivateRoute roles={['service-owner']} element={<div>VENDOR PAGE</div>} />} />
      </Routes>
    </MemoryRouter>
  );
};

beforeEach(() => jest.spyOn(window, 'alert').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

it('admits profile-role admins', () => {
  visit('/productlist/', { role: 'admin', isAdmin: false });
  expect(screen.getByText('ADMIN PAGE')).toBeInTheDocument();
});

it('admits Django staff (isAdmin) even when the profile role is customer', () => {
  visit('/productlist/', { role: 'customer', isAdmin: true });
  expect(screen.getByText('ADMIN PAGE')).toBeInTheDocument();
});

it('redirects ordinary customers home', () => {
  visit('/productlist/', { role: 'customer', isAdmin: false });
  expect(screen.getByText('HOME')).toBeInTheDocument();
});

it('redirects anonymous visitors to login', () => {
  visit('/productlist/', null);
  expect(screen.getByText('LOGIN')).toBeInTheDocument();
});

it('isAdmin does not unlock routes that do not admit admins', () => {
  visit('/vendor-only', { role: 'customer', isAdmin: true });
  expect(screen.getByText('HOME')).toBeInTheDocument();
});

it('isAdminUser matches the backend rule', () => {
  expect(isAdminUser({ role: 'admin' })).toBe(true);
  expect(isAdminUser({ role: 'customer', isAdmin: true })).toBe(true);
  expect(isAdminUser({ role: 'customer', isAdmin: false })).toBe(false);
  expect(isAdminUser({ role: 'service-owner', isAdmin: 'true' })).toBe(false);  // only a real boolean counts
  expect(isAdminUser(null)).toBe(false);
});
