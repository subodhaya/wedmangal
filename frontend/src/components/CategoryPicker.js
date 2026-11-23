import React from 'react';
import { VENDOR_CATEGORIES, isOtherCategory } from '../utils/categories';

// Category dropdown + "what wedding work do you do?" box when 'Other' is chosen.
// `cls` is the form's CSS prefix ('ap' on the sign-up form, 'mp' on the manage page).
export default function CategoryPicker({ category, customCategory, onChange, errors = {}, cls = 'ap', required }) {
  // Older listings may store 'halls' for 'Halls': show the listed category; keep truly unknown ones as they are
  const match = VENDOR_CATEGORIES.find((c) => c.value.toLowerCase() === String(category || '').toLowerCase());
  const known = Boolean(match);
  return (
    <>
      <div className={`${cls}-select-wrap`}>
        <select
          name="category"
          aria-label="Category"
          className={`${cls}-select${errors.category ? ` ${cls}-select--error` : ''}`}
          value={match ? match.value : (category || '')}
          onChange={onChange}
          required={required}
        >
          <option value="" disabled>Select a category</option>
          {category && !known && <option value={category}>{String(category).replace(/_/g, ' ')}</option>}
          {VENDOR_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        {cls === 'ap' && <i className="fa fa-caret-down ap-select-arrow"></i>}
      </div>
      {errors.category && <span className={`${cls}-field-error`}>{errors.category}</span>}
      {isOtherCategory(category) && (
        <div style={{ marginTop: 10 }}>
          <label className={`${cls}-label`} htmlFor="custom_category">What wedding work do you do? *</label>
          <input
            id="custom_category"
            type="text"
            name="custom_category"
            maxLength={60}
            className={`${cls}-input${errors.custom_category ? ` ${cls}-input--error` : ''}`}
            value={customCategory || ''}
            onChange={onChange}
            placeholder="e.g. Wedding cakes, Nadaswaram, Bridal saree rental"
          />
          {errors.custom_category && <span className={`${cls}-field-error`}>{errors.custom_category}</span>}
        </div>
      )}
    </>
  );
}
