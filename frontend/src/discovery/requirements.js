// Discovery journey: questions per category, and the structured requirement they produce.
// The requirement object matches backend/base/discovery.py (validated again there).
// Option keys in must/avoid must exist in discovery.REQUIREMENT_KEYS on the server.

const lakh = (n) => n * 100000;

export const AREA_CHOICES = ['Tambaram', 'Velachery', 'Anna Nagar', 'Adyar', 'T Nagar', 'Porur', 'Chromepet', 'Ambattur'];

const TIMEFRAME = {
  id: 'timeframe', type: 'single', title: 'When is the wedding?', optional: true,
  options: [
    { id: '3_months', label: 'Within 3 months' }, { id: '6_months', label: 'In 3–6 months' },
    { id: '12_months', label: 'In 6–12 months' }, { id: 'undecided', label: 'Not decided yet' },
  ],
};
const GUESTS = (title = 'How many guests?') => ({
  id: 'guests', type: 'single', title, optional: true,
  options: [
    { id: 'u200', label: 'Under 200', value: { max: 200 } }, { id: '200_500', label: '200–500', value: { min: 200, max: 500 } },
    { id: '500_1000', label: '500–1000', value: { min: 500, max: 1000 } }, { id: '1000p', label: '1000+', value: { min: 1000 } },
  ],
});
const budget = (buckets, per = 'event', title = 'What’s your approximate budget?') => ({
  id: 'budget', type: 'single', title,
  options: [...buckets.map(([id, label, value]) => ({ id, label, value: { ...value, per } })), { id: 'unsure', label: 'Not sure', value: { unsure: true } }],
});
const important = (options, avoid) => ({
  id: 'important', type: 'multi', title: 'What’s important to you?', optional: true,
  hint: 'Pick any — we’ll show vendors who’ve confirmed these first.', options, avoid,
});
const opt = (id, label, group = 'must_have') => ({ id, label, group });

export const QUESTION_SETS = {
  Halls: {
    noun: 'venues', prompt: 'Looking for a wedding venue?',
    questions: [
      { id: 'location', type: 'location', title: 'Where are you looking?' },
      GUESTS(),
      budget([['u1l', 'Under ₹1L', { max: lakh(1) }], ['1_2l', '₹1–2L', { min: lakh(1), max: lakh(2) }],
              ['2_5l', '₹2–5L', { min: lakh(2), max: lakh(5) }], ['5lp', '₹5L+', { min: lakh(5) }]]),
      important([opt('parking', 'Parking'), opt('ac', 'Air conditioning'), opt('veg_food', 'Vegetarian food'),
                 opt('rooms', 'Rooms for guests'), opt('budget_friendly', 'Budget-friendly', 'prefer')],
                [opt('hotel', 'Hotel', 'avoid'), opt('resort', 'Resort', 'avoid'), opt('open_lawn', 'Open lawn', 'avoid')]),
      TIMEFRAME,
    ],
  },
  Caterers: {
    noun: 'caterers', prompt: 'Looking for a caterer?',
    questions: [
      { id: 'location', type: 'location', title: 'Where is the event?' },
      GUESTS('How many plates?'),
      { id: 'food', type: 'single', title: 'Food preference', optional: true,
        options: [{ id: 'veg', label: 'Vegetarian only', must: 'veg_food' }, { id: 'both', label: 'Veg & non-veg', must: 'nonveg_food' }] },
      budget([['u400', 'Under ₹400', { max: 400 }], ['400_700', '₹400–700', { min: 400, max: 700 }],
              ['700_1000', '₹700–1,000', { min: 700, max: 1000 }], ['1000p', '₹1,000+', { min: 1000 }]], 'plate', 'Budget per plate?'),
      TIMEFRAME,
    ],
  },
  Photographers: {
    noun: 'photographers', prompt: 'Looking for a wedding photographer?',
    questions: [
      { id: 'location', type: 'location', title: 'Where is the wedding?' },
      budget([['u50k', 'Under ₹50k', { max: 50000 }], ['50k_1l', '₹50k–1L', { min: 50000, max: lakh(1) }],
              ['1_2l', '₹1–2L', { min: lakh(1), max: lakh(2) }], ['2lp', '₹2L+', { min: lakh(2) }]]),
      important([opt('candid', 'Candid'), opt('videography', 'Videography'), opt('drone', 'Drone shots'), opt('pre_wedding', 'Pre-wedding shoot')]),
      TIMEFRAME,
    ],
  },
  Makeup_Artist: {
    noun: 'makeup artists', prompt: 'Looking for a bridal makeup artist?',
    questions: [
      { id: 'location', type: 'location', title: 'Where is the wedding?' },
      budget([['u15k', 'Under ₹15k', { max: 15000 }], ['15_30k', '₹15–30k', { min: 15000, max: 30000 }],
              ['30_60k', '₹30–60k', { min: 30000, max: 60000 }], ['60kp', '₹60k+', { min: 60000 }]]),
      important([opt('bridal', 'Bridal makeup'), opt('trial', 'Trial session'), opt('home_visit', 'Comes to the venue/home')]),
      TIMEFRAME,
    ],
  },
  Mehandi_Artist: {
    noun: 'mehandi artists', prompt: 'Looking for a mehandi artist?',
    questions: [
      { id: 'location', type: 'location', title: 'Where is the wedding?' },
      budget([['u5k', 'Under ₹5k', { max: 5000 }], ['5_15k', '₹5–15k', { min: 5000, max: 15000 }], ['15kp', '₹15k+', { min: 15000 }]]),
      important([opt('bridal', 'Bridal mehandi'), opt('home_visit', 'Comes to the venue/home')]),
      TIMEFRAME,
    ],
  },
  Decorators: {
    noun: 'decorators', prompt: 'Looking for a wedding decorator?',
    questions: [
      { id: 'location', type: 'location', title: 'Where is the event?' },
      budget([['u50k', 'Under ₹50k', { max: 50000 }], ['50k_1l', '₹50k–1L', { min: 50000, max: lakh(1) }],
              ['1_3l', '₹1–3L', { min: lakh(1), max: lakh(3) }], ['3lp', '₹3L+', { min: lakh(3) }]]),
      important([opt('stage_decoration', 'Stage decoration'), opt('flower_decoration', 'Flower decoration')]),
      TIMEFRAME,
    ],
  },
  DJ_Artist: {
    noun: 'DJs', prompt: 'Looking for a DJ?',
    questions: [
      { id: 'location', type: 'location', title: 'Where is the event?' },
      budget([['u25k', 'Under ₹25k', { max: 25000 }], ['25_50k', '₹25–50k', { min: 25000, max: 50000 }], ['50kp', '₹50k+', { min: 50000 }]]),
      important([opt('sound_lights', 'Sound & lights included'), opt('outdoor', 'Outdoor event')]),
      TIMEFRAME,
    ],
  },
};

// Categories without enough structured data get the simple flow: where + when.
const GENERIC = { noun: 'vendors', prompt: 'Planning a wedding?', questions: [{ id: 'location', type: 'location', title: 'Where is the wedding?' }, TIMEFRAME] };

export const canonicalCategory = (category) =>
  Object.keys(QUESTION_SETS).find(k => k.toLowerCase() === String(category || '').toLowerCase()) || category || '';

export const questionSet = (category) => QUESTION_SETS[canonicalCategory(category)] || GENERIC;

// answers: { location: {area}|{anywhere:true}|{other}, guests: id, budget: id, food: id, important: [ids], timeframe: id }
export function answersToRequirement(category, answers) {
  const set = questionSet(category);
  const req = { version: 1, category: canonicalCategory(category) || null, location: answers.location || null,
    guest_count: null, budget: null, timeframe: answers.timeframe || null, event_date: null,
    must_have: [], prefer: [], avoid: [], dont_care: [] };
  set.questions.forEach(q => {
    const value = answers[q.id];
    if (value == null) return;
    if (q.id === 'guests') req.guest_count = q.options.find(o => o.id === value)?.value || null;
    if (q.id === 'budget') req.budget = q.options.find(o => o.id === value)?.value || null;
    if (q.id === 'food') { const o = q.options.find(x => x.id === value); if (o) req.must_have.push(o.must); }
    if (q.id === 'important') {
      [...q.options, ...(q.avoid || [])].filter(o => value.includes(o.id)).forEach(o => req[o.group].push(o.id));
    }
  });
  return req;
}

export function requirementToParams(req, sourceVendorId) {
  const p = new URLSearchParams();
  if (req.category) p.set('category', req.category);
  if (req.location?.area) p.set('area', req.location.area);
  if (req.location?.other) p.set('near', req.location.other);
  if (req.guest_count?.min) p.set('guests_min', req.guest_count.min);
  if (req.guest_count?.max) p.set('guests_max', req.guest_count.max);
  if (req.budget?.unsure) p.set('budget', 'unsure');
  if (req.budget?.min) p.set('budget_min', req.budget.min);
  if (req.budget?.max) p.set('budget_max', req.budget.max);
  if (req.budget?.per === 'plate') p.set('budget_per', 'plate');
  ['must_have', 'prefer', 'avoid'].forEach(f => req[f]?.length && p.set({ must_have: 'must', prefer: 'prefer', avoid: 'avoid' }[f], req[f].join(',')));
  if (req.timeframe) p.set('tf', req.timeframe);
  p.set('from', 'discovery');
  if (sourceVendorId) p.set('src', sourceVendorId);
  return p;
}

const num = (v) => (v ? Number(v) || null : null);
const list = (v) => (v ? v.split(',').filter(Boolean) : []);

export function paramsToRequirement(params) {
  const guests = { min: num(params.get('guests_min')), max: num(params.get('guests_max')) };
  const budget = params.get('budget') === 'unsure' ? { unsure: true }
    : (params.get('budget_min') || params.get('budget_max'))
      ? { min: num(params.get('budget_min')), max: num(params.get('budget_max')), per: params.get('budget_per') === 'plate' ? 'plate' : 'event' }
      : null;
  return {
    version: 1, category: canonicalCategory(params.get('category')) || null,
    location: params.get('area') ? { area: params.get('area') } : params.get('near') ? { other: params.get('near') } : { anywhere: true },
    guest_count: guests.min || guests.max ? guests : null, budget,
    timeframe: params.get('tf') || null, event_date: null,
    must_have: list(params.get('must')), prefer: list(params.get('prefer')), avoid: list(params.get('avoid')), dont_care: [],
  };
}

// Rebuild flow answers from a requirement (for "Edit requirements")
export function requirementToAnswers(req) {
  const set = questionSet(req.category);
  const answers = { location: req.location || null, timeframe: req.timeframe || null };
  set.questions.forEach(q => {
    const same = (a, b) => a && b && (a.min || null) === (b.min || null) && (a.max || null) === (b.max || null);
    if (q.id === 'guests') answers.guests = q.options.find(o => same(o.value, req.guest_count))?.id || null;
    if (q.id === 'budget') answers.budget = req.budget?.unsure ? 'unsure' : q.options.find(o => same(o.value, req.budget))?.id || null;
    if (q.id === 'food') answers.food = q.options.find(o => req.must_have.includes(o.must))?.id || null;
    if (q.id === 'important') answers.important = [...q.options, ...(q.avoid || [])].filter(o => req[o.group].includes(o.id)).map(o => o.id);
  });
  return answers;
}

const LABELS = Object.fromEntries(Object.values(QUESTION_SETS).flatMap(s => s.questions)
  .flatMap(q => [...(q.options || []), ...(q.avoid || [])]).filter(o => o.group || o.must).map(o => [o.must || o.id, o.label]));
LABELS.veg_food = 'Vegetarian food';
LABELS.nonveg_food = 'Non-veg food';

const rupees = (n) => (n >= 100000 ? `₹${n / 100000}L` : `₹${n.toLocaleString('en-IN')}`);
const range = (b, fmt) => (b.min && b.max ? `${fmt(b.min)}–${fmt(b.max)}` : b.max ? `under ${fmt(b.max)}` : `${fmt(b.min)}+`);

export function requirementChips(req) {
  const tf = TIMEFRAME.options.find(o => o.id === req.timeframe)?.label;
  return [
    req.location?.area || req.location?.other || (req.location?.anywhere && 'Anywhere in Chennai'),
    req.guest_count && `${range(req.guest_count, n => n.toLocaleString('en-IN'))} guests`,
    req.budget?.unsure ? 'Budget: not sure' : req.budget && `Budget ${range(req.budget, rupees)}${req.budget.per === 'plate' ? ' per plate' : ''}`,
    ...req.must_have.map(k => `Must have: ${LABELS[k] || k}`),
    ...req.prefer.map(k => `Prefer: ${LABELS[k] || k}`),
    ...req.avoid.map(k => `Avoid: ${LABELS[k] || k}`),
    tf,
  ].filter(Boolean);
}

// The same requirement in the existing search-log filter keys (backend search_intent.FILTER_KEYS)
export function requirementToFilters(req) {
  return {
    ...(req.category && { category: req.category }),
    ...(req.location?.area && { area_name: req.location.area }),
    ...((req.guest_count?.min || req.guest_count?.max) && { hall_capacity: req.guest_count.min || req.guest_count.max }),
    ...(req.budget?.min && { min_price: req.budget.min }),
    ...(req.budget?.max && { max_price: req.budget.max }),
    ...(req.must_have.includes('parking') && { hall_parking: true }),
    ...(req.must_have.includes('ac') && { hall_ac: true }),
    ...(req.must_have.includes('veg_food') && { food_type: 'veg' }),
    ...(!req.must_have.includes('veg_food') && req.must_have.includes('nonveg_food') && { food_type: 'nonveg' }),
  };
}

// ── Budget Planner (existing /budget/ screen) ────────────────────────────────
// Discovery category → the planner's expense line. Categories without a line just open the planner.
export const BUDGET_LINES = { Halls: 'venue', Caterers: 'catering', Decorators: 'decoration', Photographers: 'photography' };
const LINE_LABELS = { venue: 'venue', catering: 'catering', decoration: 'decoration', photography: 'photography' };

// The amount the visitor chose (their upper limit where they gave a range). Per-plate budgets are not
// converted into a total — that would need a guest count we don't know.
export function plannerAmount(req) {
  const b = req?.budget;
  if (!b || b.unsure || b.per === 'plate') return null;
  return b.max || b.min || null;
}

export function budgetPlannerLink(req) {
  const p = new URLSearchParams({ from: 'discovery' });
  const line = BUDGET_LINES[req?.category];
  const amount = plannerAmount(req);
  if (line) p.set('line', line);
  if (line && amount) p.set('amount', amount);
  return `/budget/?${p.toString()}`;
}

export const budgetLineLabel = (line) => LINE_LABELS[line] || '';
