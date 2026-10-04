import React, { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import lazyRoute from './lazyRoute';

const Screen = () => <p>Loaded screen</p>;
const chunkError = () => Object.assign(new Error('Loading chunk 42 failed.'), { name: 'ChunkLoadError' });

beforeEach(() => {
  sessionStorage.clear();
  delete window.location;
  window.location = { reload: jest.fn() };
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => console.error.mockRestore());

it('renders the screen once its code has loaded', async () => {
  const Lazy = lazyRoute(() => Promise.resolve({ default: Screen }));
  render(<Suspense fallback={<p>Loading…</p>}><Lazy /></Suspense>);
  expect(screen.getByText('Loading…')).toBeInTheDocument();
  expect(await screen.findByText('Loaded screen')).toBeInTheDocument();
  expect(window.location.reload).not.toHaveBeenCalled();
});

it('reloads once when a screen file from an older deploy is missing', async () => {
  const Lazy = lazyRoute(() => Promise.reject(chunkError()));
  render(<Suspense fallback={<p>Loading…</p>}><Lazy /></Suspense>);
  await new Promise(r => setTimeout(r, 0));
  expect(window.location.reload).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Loading…')).toBeInTheDocument();   // stays on the spinner, not a blank page
});

it('does not reload in a loop if the file is still missing after reloading', async () => {
  sessionStorage.setItem('wm_chunk_reload', '1');
  class Boundary extends React.Component {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() { return this.state.failed ? <p>Failed</p> : this.props.children; }
  }
  const Lazy = lazyRoute(() => Promise.reject(chunkError()));
  render(<Boundary><Suspense fallback={<p>Loading…</p>}><Lazy /></Suspense></Boundary>);
  expect(await screen.findByText('Failed')).toBeInTheDocument();
  expect(window.location.reload).not.toHaveBeenCalled();
});
