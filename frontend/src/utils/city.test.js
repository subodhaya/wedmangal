import { getCity, hasChosenCity, isListingRequest, setCity } from './city';

beforeEach(() => window.localStorage.clear());

test('defaults to Chennai until the visitor chooses', () => {
  expect(hasChosenCity()).toBe(false);
  expect(getCity()).toBe('Chennai');
  setCity('Bangalore');
  expect(getCity()).toBe('Bangalore');
  setCity('Mumbai');                              // not a city we cover — ignored
  expect(getCity()).toBe('Bangalore');
});

test('only vendor-listing requests carry the city', () => {
  ['/api/products/all', '/api/products/all/top/', '/api/products/available-today/', '/api/search/', '/api/reels/']
    .forEach(url => expect(isListingRequest(url)).toBe(true));
  ['/api/products/747/', '/api/users/profile/', '/api/search/city/', '/api/products/mine/']
    .forEach(url => expect(isListingRequest(url)).toBe(false));
});
