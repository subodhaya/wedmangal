import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import api from '../utils/api';
import SearchResultScreen from '../screens/SearchResultScreen';
import DiscoveryFlow from './DiscoveryFlow';
import DiscoveryPrompt from './DiscoveryPrompt';
import DiscoveryContact from './DiscoveryContact';
import { answersToRequirement, paramsToRequirement, requirementChips, requirementToAnswers,
  requirementToFilters, requirementToParams } from './requirements';

jest.mock('../utils/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() }, BASE_URL: '' }));

const HALL_ANSWERS = { location: { area: 'Tambaram' }, guests: '500_1000', budget: '2_5l', important: ['parking', 'veg_food', 'budget_friendly', 'hotel'], timeframe: '6_months' };
const sent = (type) => global.fetch.mock.calls.map(([url, o]) => [url, JSON.parse(o.body)])
  .filter(([url, b]) => (type ? b.event_type === type : true));

beforeEach(() => {
  sessionStorage.clear(); localStorage.clear();
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({ id: 7 }) }));
});

describe('requirement object', () => {
  it('turns hall answers into must/prefer/avoid without inventing anything', () => {
    const req = answersToRequirement('halls', HALL_ANSWERS);
    expect(req).toEqual({ version: 1, category: 'Halls', location: { area: 'Tambaram' }, guest_count: { min: 500, max: 1000 },
      budget: { min: 200000, max: 500000, per: 'event' }, timeframe: '6_months', event_date: null,
      must_have: ['parking', 'veg_food'], prefer: ['budget_friendly'], avoid: ['hotel'], dont_care: [] });
  });

  it('round-trips through the search URL and back into answers', () => {
    const req = answersToRequirement('Halls', HALL_ANSWERS);
    const params = requirementToParams(req, 42);
    expect(params.toString()).toBe('category=Halls&area=Tambaram&guests_min=500&guests_max=1000&budget_min=200000&budget_max=500000'
      + '&must=parking%2Cveg_food&prefer=budget_friendly&avoid=hotel&tf=6_months&from=discovery&src=42');
    expect(paramsToRequirement(params)).toEqual(req);
    expect(requirementToAnswers(req)).toEqual(HALL_ANSWERS);
  });

  it('keeps unanswered and "not sure" as unknown', () => {
    const req = answersToRequirement('Halls', { location: { anywhere: true }, budget: 'unsure' });
    expect([req.guest_count, req.budget, req.must_have]).toEqual([null, { unsure: true }, []]);
    expect(requirementChips(req)).toEqual(['Anywhere in Chennai', 'Budget: not sure']);
  });

  it('maps to the existing search-intent filter keys', () => {
    expect(requirementToFilters(answersToRequirement('Halls', HALL_ANSWERS))).toEqual({ category: 'Halls', area_name: 'Tambaram',
      hall_capacity: 500, min_price: 200000, max_price: 500000, hall_parking: true, food_type: 'veg' });
  });

  it('uses category-specific questions', () => {
    const req = answersToRequirement('Photographers', { budget: '1_2l', important: ['candid', 'drone'] });
    expect([req.budget, req.must_have]).toEqual([{ min: 100000, max: 200000, per: 'event' }, ['candid', 'drone']]);
    expect(answersToRequirement('Caterers', { food: 'veg', budget: '400_700' }).budget.per).toBe('plate');
  });
});

const ShowLocation = () => { const l = useLocation(); return <p data-testid="loc">{l.pathname}{l.search}</p>; };
const renderFlow = (props) => render(
  <MemoryRouter initialEntries={['/product/42']}>
    <Routes>
      <Route path="/product/:id" element={<DiscoveryFlow category="Halls" sourceVendorId={42} sourceArea="Selaiyur" {...props} />} />
      <Route path="/search/" element={<ShowLocation />} />
    </Routes>
  </MemoryRouter>
);

describe('question flow', () => {
  it('asks a few chip questions, supports back and multi-select, then opens matching vendors', async () => {
    renderFlow();
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Selaiyur' })).toBeInTheDocument();      // the vendor's own area first
    fireEvent.click(screen.getByRole('button', { name: 'Tambaram' }));
    expect(screen.getByText('How many guests?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '← Back' }));                  // back keeps the answer
    expect(screen.getByRole('button', { name: 'Tambaram' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Next →' }));
    fireEvent.click(screen.getByRole('button', { name: '500–1000' }));
    fireEvent.click(screen.getByRole('button', { name: '₹2–5L' }));
    fireEvent.click(screen.getByRole('button', { name: 'Parking' }));
    fireEvent.click(screen.getByRole('button', { name: 'Vegetarian food' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hotel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Parking' }));                 // toggled off again
    expect(screen.getByRole('button', { name: 'Parking' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));                    // date not answered
    for (const chip of ['Tambaram', '500–1,000 guests', 'Budget ₹2L–₹5L', 'Must have: Vegetarian food', 'Avoid: Hotel']) {
      expect(screen.getByText(chip)).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Show matching venues' }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/search/?category=Halls&area=Tambaram&guests_min=500&guests_max=1000'
      + '&budget_min=200000&budget_max=500000&must=veg_food&avoid=hotel&from=discovery&src=42');
    expect(sent('discovery_question_answered').length).toBeGreaterThanOrEqual(4);
    expect(sent('discovery_requirements_completed')).toHaveLength(1);
    expect(JSON.stringify(sent())).not.toMatch(/\d{10}/);                              // no phone numbers in analytics
  });

  it('remembers answers for the session', () => {
    const { unmount } = renderFlow();
    fireEvent.click(screen.getByRole('button', { name: 'Adyar' }));
    unmount();
    renderFlow();
    expect(screen.getByRole('button', { name: 'Adyar' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('uses a simple flow for categories without structured details', () => {
    renderFlow({ category: 'Jewellery' });
    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();
  });
});

describe('vendor page prompt', () => {
  it('uses category wording and loads the questions only on tap', async () => {
    render(<MemoryRouter><DiscoveryPrompt vendor={{ _id: 42, category: 'Halls', area_name: 'Adyar' }} /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Looking for a wedding venue?' })).toBeInTheDocument();
    expect(screen.queryByText(/Question 1/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Help me find venues' }));
    expect(await screen.findByText('Question 1 of 5')).toBeInTheDocument();
    expect(sent('discovery_started')[0][1]).toMatchObject({ vendor_id: 42, metadata: { category: 'Halls' } });
  });
});

describe('contact', () => {
  const req = answersToRequirement('Halls', HALL_ANSWERS);
  const openForm = () => {
    render(<DiscoveryContact requirement={req} sourceVendorId="42" />);
    fireEvent.click(screen.getByRole('button', { name: 'Get help from WedMangal' }));
  };

  it('keeps Get help disabled until consent is ticked (never pre-ticked)', () => {
    openForm();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Get help' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Get help' })).toBeEnabled();
    expect(sent('discovery_contact_opened')).toHaveLength(1);
  });

  it('validates name and mobile before sending', () => {
    openForm();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '12345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Get help' }));
    expect(screen.getByText('Please enter your name.')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid 10-digit Indian mobile number.')).toBeInTheDocument();
    expect(sent().filter(([url]) => url.includes('/leads/'))).toHaveLength(0);
  });

  it('sends the lead with the requirement, source vendor and consent', async () => {
    openForm();
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Ravi' } });
    fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '98765 43210' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Get help' }));
    expect(await screen.findByText('Thank you, Ravi')).toBeInTheDocument();
    expect(screen.getByText(/\+91 98••••••10/)).toBeInTheDocument();
    const [url, body] = sent().find(([u]) => u.includes('/api/discovery/leads/'));
    expect(url).toBe('/api/discovery/leads/');
    expect(body).toMatchObject({ name: 'Ravi', phone: '98765 43210', consent: true, source_vendor_id: '42', requirements: req });
  });

  it('shows server-side errors', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 400, json: () => Promise.resolve({ errors: { consent: 'Please agree to be contacted by WedMangal about your requirement.' } }) }));
    openForm();
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Ravi' } });
    fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '9876543210' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Get help' }));
    expect(await screen.findByText(/Please agree to be contacted by WedMangal/)).toBeInTheDocument();
  });
});

describe('matching results', () => {
  const options = { categories: [{ key: 'Halls', label: 'Wedding Halls & Venues' }], ratings: [4, 4.5], sorts: ['relevance'] };
  const data = (count) => ({ query: '', count, page: 1, pages: 1, interpreted: {}, options, suggestions: [],
    applied: { category: 'Halls', area: 'Tambaram', min_rating: null, sort: 'relevance' },
    notes: ['We noted 500 guests, but venue capacities aren’t available yet, so results aren’t filtered by capacity.'],
    results: count ? [{ _id: 5, name: 'Sri Mahal', category_label: 'Wedding Halls & Venues', area_name: 'Tambaram', city: 'Chennai', image: '', rating: 4.6, google_reviews: 9, price_from: null, price_to: null, business_phone: '9876543210' }] : [] });
  const url = '/search/?category=Halls&area=Tambaram&guests_min=500&guests_max=1000&must=parking&avoid=hotel&from=discovery&src=42';
  const renderResults = () => render(
    <HelmetProvider><MemoryRouter initialEntries={[url]}><Routes><Route path="/search/" element={<SearchResultScreen />} /></Routes></MemoryRouter></HelmetProvider>);

  it('passes the requirement to the existing search and says what it is based on', async () => {
    api.get.mockResolvedValue({ data: data(1) });
    renderResults();
    expect(await screen.findByRole('heading', { level: 1, name: 'Wedding Halls & Venues matching your requirements' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/api/search/', { params: expect.objectContaining({ category: 'Halls', area: 'Tambaram',
      guests_min: '500', guests_max: '1000', must: 'parking', avoid: 'hotel', from: 'discovery' }) });
    const chips = screen.getByLabelText('Your requirements');
    for (const chip of ['Tambaram', '500–1,000 guests', 'Must have: Parking', 'Avoid: Hotel']) expect(within(chips).getByText(chip)).toBeInTheDocument();
    expect(screen.getByText(/capacities aren’t available yet/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sri Mahal' })).toHaveAttribute('href', '/product/5?ref=discovery');
    expect(screen.getByRole('heading', { name: 'Want help finding the right vendors?' })).toBeInTheDocument();
    await waitFor(() => expect(sent('discovery_matching_results')).toHaveLength(1));
    expect(sent('discovery_matching_results')[0][1]).toMatchObject({ vendor_id: '42', metadata: { label: '1 results' } });
  });

  it('is honest about no matches and still offers help', async () => {
    api.get.mockResolvedValue({ data: data(0) });
    renderResults();
    expect(await screen.findByText('No exact matches found')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Want help finding the right vendors?' })).toBeInTheDocument();
  });

  it('lets the visitor edit the requirement', async () => {
    api.get.mockResolvedValue({ data: data(1) });
    renderResults();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit requirements' }));
    expect(await screen.findByText('Question 1 of 5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tambaram' })).toHaveAttribute('aria-pressed', 'true');
  });
});
