import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import DiscoveryNextSteps from './DiscoveryNextSteps';
import SavedRequirements from './SavedRequirements';
import BudgetScreen from '../screens/BudgetScreen';
import { answersToRequirement, budgetPlannerLink, requirementToParams } from './requirements';

jest.mock('../utils/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() }, BASE_URL: '' }));
jest.mock('react-chartjs-2', () => ({ Pie: () => null }));

const REQ = answersToRequirement('Halls', { location: { area: 'Tambaram' }, guests: '500_1000', budget: '2_5l', important: ['parking'] });
const RESULTS = `/search/?${requirementToParams(REQ, 42).toString()}`;
const BackButton = () => { const n = useNavigate(); return <button type="button" onClick={() => n(-1)}>back</button>; };
const ShowLocation = () => { const l = useLocation(); return <p data-testid="loc">{l.pathname}{l.search}</p>; };
const sentEvents = () => global.fetch.mock.calls.map(([, o]) => JSON.parse(o.body)).map(b => b.event_type);
const login = () => localStorage.setItem('userInfo', JSON.stringify({ id: 5, token: 't' }));

const renderSteps = (url = RESULTS) => render(
  <MemoryRouter initialEntries={[url]}>
    <Routes>
      <Route path="/search/" element={<><DiscoveryNextSteps requirement={REQ} sourceVendorId="42" /><ShowLocation /></>} />
      <Route path="/login" element={<ShowLocation />} />
      <Route path="/budget/" element={<ShowLocation />} />
    </Routes>
  </MemoryRouter>
);

beforeEach(() => {
  jest.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({}) }));
});

describe('budget planner link', () => {
  it('carries the category line and the amount the visitor chose', () => {
    expect(budgetPlannerLink(REQ)).toBe('/budget/?from=discovery&line=venue&amount=500000');
  });
  it('never turns a per-plate or unsure budget into a total', () => {
    expect(budgetPlannerLink(answersToRequirement('Caterers', { budget: '400_700' }))).toBe('/budget/?from=discovery&line=catering');
    expect(budgetPlannerLink(answersToRequirement('Halls', { budget: 'unsure' }))).toBe('/budget/?from=discovery&line=venue');
    expect(budgetPlannerLink(answersToRequirement('Jewellery', {}))).toBe('/budget/?from=discovery');
  });
  it('opens the existing planner and records it', () => {
    renderSteps();
    fireEvent.click(screen.getByRole('link', { name: 'Plan your wedding budget' }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/budget/?from=discovery&line=venue&amount=500000');
    expect(sentEvents()).toContain('discovery_budget_opened');
    expect(sessionStorage.getItem('wm_discovery_last')).toBe(RESULTS);
  });
});

describe('save my requirements', () => {
  it('saves straight away when logged in', async () => {
    login(); api.post.mockResolvedValue({ data: { id: 1, saved: true } });
    renderSteps();
    fireEvent.click(screen.getByRole('button', { name: 'Save my requirements' }));
    expect(await screen.findByText(/Saved — find it under your profile/)).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/api/discovery/saved/', { requirements: REQ, source_vendor_id: '42' });
    expect(sentEvents()).toContain('discovery_save_started');
  });

  it('uses the existing login, then comes back to finish saving', async () => {
    renderSteps();
    fireEvent.click(screen.getByRole('button', { name: 'Save my requirements' }));
    const loc = screen.getByTestId('loc').textContent;
    expect(loc.startsWith('/login?redirect=')).toBe(true);
    expect(decodeURIComponent(loc.split('redirect=')[1])).toBe(`${RESULTS}&save=1`);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('finishes the save once after login and tidies the URL', async () => {
    login(); api.post.mockResolvedValue({ data: { id: 1, saved: true } });
    renderSteps(`${RESULTS}&save=1`);
    expect(await screen.findByText(/Saved — find it under your profile/)).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('loc').textContent).not.toContain('save=1');
  });
});

describe('Budget Planner opened from discovery', () => {
  const renderBudget = (url) => render(
    <MemoryRouter initialEntries={[url]}>
      <Routes><Route path="/budget/" element={<BudgetScreen />} /><Route path="/login" element={<ShowLocation />} /></Routes>
    </MemoryRouter>
  );

  it('suggests the venue amount on an empty line and links back to the results', async () => {
    login(); sessionStorage.setItem('wm_discovery_last', RESULTS);
    api.get.mockResolvedValue({ data: { total_budget: 0, expenses: {} } });
    renderBudget('/budget/?from=discovery&line=venue&amount=500000');
    expect(await screen.findByText(/We’ve added your venue budget \(₹5,00,000\) from your search/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Back to your matching vendors' })).toHaveAttribute('href', RESULTS);
  });

  it('never overwrites an amount the visitor already saved', async () => {
    login();
    api.get.mockResolvedValue({ data: { total_budget: 2000000, expenses: { venue: 300000 } } });
    renderBudget('/budget/?from=discovery&line=venue&amount=500000');
    expect(await screen.findByText(/Your saved plan has ₹3,00,000 — we haven’t changed it/)).toBeInTheDocument();
  });

  it('does not trap the Back button in a login redirect', () => {
    render(
      <MemoryRouter initialEntries={['/search/?from=discovery', '/budget/?from=discovery']} initialIndex={1}>
        <Routes><Route path="/budget/" element={<BudgetScreen />} /><Route path="/login" element={<ShowLocation />} />
          <Route path="/search/" element={<ShowLocation />} /></Routes>
        <BackButton />
      </MemoryRouter>
    );
    expect(screen.getByTestId('loc').textContent.startsWith('/login')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'back' }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/search/?from=discovery');
  });

  it('keeps the discovery context through login', () => {
    renderBudget('/budget/?from=discovery&line=venue&amount=500000');
    expect(decodeURIComponent(screen.getByTestId('loc').textContent.split('redirect=')[1]))
      .toBe('/budget/?from=discovery&line=venue&amount=500000');
  });

  it('plain Budget Planner is unchanged', async () => {
    login(); api.get.mockResolvedValue({ data: { total_budget: 0, expenses: {} } });
    renderBudget('/budget/');
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(screen.queryByText(/from your search/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Back to your matching vendors/)).not.toBeInTheDocument();
  });
});

it('lists saved requirements on the profile with a link back to matches', async () => {
  api.get.mockResolvedValue({ data: [{ id: 1, category: 'Halls', requirements: REQ, summary: [] }] });
  render(<MemoryRouter><SavedRequirements /></MemoryRouter>);
  expect(await screen.findByText(/Tambaram · 500–1,000 guests/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'View matching vendors →' }).getAttribute('href')).toContain('from=discovery');
});
