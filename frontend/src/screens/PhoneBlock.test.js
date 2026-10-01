import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PhoneBlock } from './ProductScreen';

beforeEach(() => {
  localStorage.clear();
});

const renderBlock = () =>
  render(<PhoneBlock label="📞 Business Phone" phone="98765 43210" businessName="Lotus Hall" vendorId={42} />);

it('tracks a WhatsApp click without blocking the link', () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({}) }));
  renderBlock();
  const link = screen.getByTitle('WhatsApp');
  expect(link).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\/919876543210\?text=/));
  const notPrevented = fireEvent.click(link);
  expect(notPrevented).toBe(true);
  expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toMatchObject({ event_type: 'whatsapp_click', vendor_id: 42 });
});

it('tracks a phone click without blocking the call', () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({}) }));
  renderBlock();
  const link = screen.getByTitle('Call');
  expect(link).toHaveAttribute('href', 'tel:919876543210');
  expect(fireEvent.click(link)).toBe(true);
  expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toMatchObject({ event_type: 'phone_click', vendor_id: 42 });
});

it('WhatsApp and phone links still work when analytics is down', () => {
  global.fetch = jest.fn(() => { throw new Error('analytics unavailable'); });
  renderBlock();
  expect(() => fireEvent.click(screen.getByTitle('WhatsApp'))).not.toThrow();
  expect(fireEvent.click(screen.getByTitle('Call'))).toBe(true);
  expect(screen.getByTitle('WhatsApp')).toHaveAttribute('href', expect.stringContaining('wa.me/919876543210'));
});
