import { apiUrl, assetUrl, isServerPage, API_ORIGIN, SITE_ORIGIN, isNativeApp } from './native';

it('changes nothing on the website', () => {
  expect(isNativeApp).toBe(false);
  expect(apiUrl('/api/search/')).toBe('/api/search/');
  expect(assetUrl('/static/images/a.jpg')).toBe('/static/images/a.jpg');
  expect(assetUrl('images/a.jpg')).toBe('images/a.jpg');
});

it('makes server URLs absolute in the app', () => {
  expect(apiUrl('/api/search/', true)).toBe(`${API_ORIGIN}/api/search/`);
  expect(assetUrl('/static/images/a.jpg', true)).toBe(`${SITE_ORIGIN}/static/images/a.jpg`);
  expect(assetUrl('images/a.jpg', true)).toBe(`${SITE_ORIGIN}/images/a.jpg`);
});

it('leaves full, blob, data and missing URLs alone', () => {
  ['https://cdn.example/a.jpg', '//cdn.example/a.jpg', 'blob:https://localhost/1', 'data:image/png;base64,AA', '', null, undefined]
    .forEach((url) => expect(assetUrl(url, true)).toBe(url));
});

it('knows which pages only the server has', () => {
  ['/chennai', '/chennai/adyar', '/list-your-business', '/admin/base/'].forEach((p) => expect(isServerPage(p)).toBe(true));
  ['/', '/blog/chennai', '/chennai-venues', '/search/'].forEach((p) => expect(isServerPage(p)).toBe(false));
});
