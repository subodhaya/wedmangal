import axios from 'axios';

jest.mock('axios', () => {
  const instance = { interceptors: { request: { use: jest.fn() } } };
  return { __esModule: true, default: { create: jest.fn(() => instance), post: jest.fn() } };
});

const jwt = (exp) => `x.${btoa(JSON.stringify({ exp }))}.y`;
const EXPIRED = jwt(1);
const session = { name: 'Ravi', token: EXPIRED, refresh: 'refresh-token' };

let beforeRequest;
const originalLocation = window.location;

beforeAll(() => {
  const api = require('./api').default;
  beforeRequest = api.interceptors.request.use.mock.calls[0][0];
  delete window.location;
  window.location = { origin: 'http://localhost:3000', href: '' };
});
afterAll(() => { window.location = originalLocation; });

beforeEach(() => {
  localStorage.setItem('userInfo', JSON.stringify(session));
  window.location.href = '';
  axios.post.mockReset();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

const request = () => beforeRequest({ url: '/api/users/profile/', method: 'get', headers: {} });

it('renews an expired access token silently', async () => {
  axios.post.mockResolvedValue({ data: { access: 'new-access' } });
  const config = await request();
  expect(config.headers.Authorization).toBe('Bearer new-access');
  expect(JSON.parse(localStorage.getItem('userInfo')).token).toBe('new-access');
});

it('stays logged in when the network fails during renewal', async () => {
  axios.post.mockRejectedValue(new Error('Network Error'));
  await request();
  expect(JSON.parse(localStorage.getItem('userInfo')).refresh).toBe('refresh-token');
  expect(window.location.href).toBe('');
});

it('stays logged in when the server has an error during renewal', async () => {
  axios.post.mockRejectedValue({ response: { status: 502 } });
  await request();
  expect(localStorage.getItem('userInfo')).not.toBeNull();
  expect(window.location.href).toBe('');
});

it('logs out when the server rejects the refresh token', async () => {
  axios.post.mockRejectedValue({ response: { status: 401 } });
  await request();
  expect(localStorage.getItem('userInfo')).toBeNull();
  expect(window.location.href).toBe('/login');
});
