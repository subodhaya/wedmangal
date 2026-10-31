import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RemovalRequestModal from './RemovalRequestModal';

const vendor = { _id: 42, name: 'Lotus Hall' };

const respond = (status, body) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

const fill = ({ relationship = 'owner', consent = true } = {}) => {
  fireEvent.change(screen.getByLabelText(/^your name/i), { target: { value: 'Ravi' } });
  fireEvent.change(screen.getByLabelText(/^phone number/i), { target: { value: '98765 43210' } });
  fireEvent.change(screen.getByLabelText(/^e-mail address/i), { target: { value: 'ravi@example.com' } });
  fireEvent.change(screen.getByLabelText(/your relationship/i), { target: { value: relationship } });
  if (consent) fireEvent.click(screen.getByRole('checkbox'));
};
const submit = () => fireEvent.click(screen.getByRole('button', { name: /send request/i }));

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn(() => respond(201, { reference: 'RR-ABCD2345', status: 'pending' }));
});

it('shows the listing being reported, pre-filled', () => {
  render(<RemovalRequestModal vendor={vendor} type="unlist" onClose={() => {}} />);
  expect(screen.getByText('Lotus Hall')).toBeInTheDocument();
  expect(screen.getByText(/\/product\/42$/)).toBeInTheDocument();
});

it('requires a reason and consent before sending an unlisting request', () => {
  render(<RemovalRequestModal vendor={vendor} type="unlist" onClose={() => {}} />);
  fill({ consent: false });
  submit();
  expect(screen.getByText('Please choose a reason.')).toBeInTheDocument();
  expect(screen.getByText(/Please confirm the information is accurate/)).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

it('sends an unlisting request and shows the reference number', async () => {
  render(<RemovalRequestModal vendor={vendor} type="unlist" onClose={() => {}} />);
  fill();
  fireEvent.click(screen.getByLabelText('Business permanently closed.'));
  submit();
  expect(await screen.findByText('RR-ABCD2345')).toBeInTheDocument();
  const [url, options] = global.fetch.mock.calls[0];
  expect(url).toMatch(/\/api\/removal-requests\/$/);
  expect(JSON.parse(options.body)).toMatchObject({
    vendor_id: 42, request_type: 'unlist', reason: 'closed', requester_phone: '98765 43210',
    requester_relationship: 'owner', consent: true, website: '',
  });
});

it('incorrect information needs a description of what is wrong', () => {
  render(<RemovalRequestModal vendor={vendor} type="incorrect_information" onClose={() => {}} />);
  fill();
  submit();
  expect(screen.getByText('Please tell us what is incorrect.')).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

it('sends a copyright complaint as a form with the evidence file', async () => {
  render(<RemovalRequestModal vendor={vendor} type="copyright" onClose={() => {}} />);
  fill({ relationship: 'content_owner' });
  fireEvent.change(screen.getByLabelText(/which photo/i), { target: { value: 'Third stage photo' } });
  fireEvent.change(screen.getByLabelText(/explain your complaint/i), { target: { value: 'My photo' } });
  const file = new File(['%PDF-1.4'], 'licence.pdf', { type: 'application/pdf' });
  fireEvent.change(screen.getByLabelText(/proof of ownership/i), { target: { files: [file] } });
  submit();
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  const [url, options] = global.fetch.mock.calls[0];
  expect(url).toMatch(/\/api\/removal-requests\/copyright\/$/);
  expect(options.body).toBeInstanceOf(FormData);
  expect(options.body.get('disputed_content')).toBe('Third stage photo');
  expect(options.body.get('evidence_file').name).toBe('licence.pdf');
  expect(options.body.get('reason')).toBeNull();
});

it('refuses an evidence file of the wrong type', () => {
  render(<RemovalRequestModal vendor={vendor} type="copyright" onClose={() => {}} />);
  fill({ relationship: 'content_owner' });
  fireEvent.change(screen.getByLabelText(/which photo/i), { target: { value: 'x' } });
  fireEvent.change(screen.getByLabelText(/explain your complaint/i), { target: { value: 'y' } });
  fireEvent.change(screen.getByLabelText(/proof of ownership/i),
    { target: { files: [new File(['MZ'], 'tool.exe')] } });
  submit();
  expect(screen.getByText('Upload a PDF, JPG, PNG or WEBP file.')).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

it('shows server validation errors next to the fields', async () => {
  global.fetch = jest.fn(() => respond(400, { errors: { requester_email: 'Enter a valid e-mail address.' } }));
  render(<RemovalRequestModal vendor={vendor} type="unlist" onClose={() => {}} />);
  fill();
  fireEvent.click(screen.getByLabelText('Duplicate listing.'));
  submit();
  expect(await screen.findByText('Enter a valid e-mail address.')).toBeInTheDocument();
});

it('tells the visitor when they already have an open request', async () => {
  global.fetch = jest.fn(() => respond(200, { duplicate: true, detail: 'You already have an open request about this listing.' }));
  render(<RemovalRequestModal vendor={vendor} type="unlist" onClose={() => {}} />);
  fill();
  fireEvent.click(screen.getByLabelText('Duplicate listing.'));
  submit();
  expect(await screen.findByText('You already have an open request about this listing.')).toBeInTheDocument();
});
