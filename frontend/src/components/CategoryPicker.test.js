import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CategoryPicker from './CategoryPicker';
import { categoryText } from '../utils/categories';

function Form({ initial = '' }) {
  const [data, setData] = useState({ category: initial, custom_category: '' });
  const onChange = (e) => setData({ ...data, [e.target.name]: e.target.value });
  return <CategoryPicker category={data.category} customCategory={data.custom_category} onChange={onChange} />;
}

test('offers Return Gifts and asks for their own words when Other is chosen', () => {
  render(<Form />);
  expect(screen.getByRole('option', { name: 'Return Gifts' })).toBeInTheDocument();
  expect(screen.queryByLabelText(/what wedding work/i)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Other' } });
  const box = screen.getByLabelText(/what wedding work/i);
  fireEvent.change(box, { target: { value: 'Wedding cakes' } });
  expect(box).toHaveValue('Wedding cakes');
});

test('keeps an old category that is not in the list', () => {
  render(<Form initial="Florist" />);
  expect(screen.getByLabelText('Category')).toHaveValue('Florist');
});

test('categoryText shows the vendor\'s own words for Other', () => {
  expect(categoryText({ category: 'Other', custom_category: 'Wedding cakes' })).toBe('Wedding cakes');
  expect(categoryText({ category: 'Return_Gifts' })).toBe('Return Gifts');
  expect(categoryText({ category: 'Makeup_Artist' })).toBe('Makeup Artist');
});
