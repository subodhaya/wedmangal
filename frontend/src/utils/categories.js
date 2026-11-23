// The categories a vendor can choose (keys match Product.category on the backend).
// 'Other' lets the vendor describe their own wedding work in `custom_category`.
export const VENDOR_CATEGORIES = [
  { value: 'Halls', label: 'Wedding Halls & Venues' },
  { value: 'Photographers', label: 'Photographers' },
  { value: 'Makeup_Artist', label: 'Makeup Artist' },
  { value: 'Caterers', label: 'Caterers' },
  { value: 'Decorators', label: 'Decorators' },
  { value: 'Mehandi_Artist', label: 'Mehandi Artist' },
  { value: 'Planners', label: 'Wedding Planners' },
  { value: 'Invitation', label: 'Invitation' },
  { value: 'Jewellery', label: 'Jewellery' },
  { value: 'DJ_Artist', label: 'DJ Artist' },
  { value: 'Entertainment', label: 'Music & Entertainment' },
  { value: 'Travel_Transport', label: 'Travel and Transport' },
  { value: 'Pandit', label: 'Pandit' },
  { value: 'Return_Gifts', label: 'Return Gifts' },
  { value: 'Other', label: 'Other — I will type my wedding work' },
];

export const isOtherCategory = (category) => String(category || '').toLowerCase() === 'other';

// What to show couples for a vendor's category: their own words for 'Other', otherwise the category name.
export function categoryText(vendor) {
  if (isOtherCategory(vendor?.category) && vendor?.custom_category) return vendor.custom_category;
  if (String(vendor?.category || '') === 'Return_Gifts') return 'Return Gifts';
  return String(vendor?.category || '').replace(/_/g, ' ');
}

export const CUSTOM_CATEGORY_ERROR = 'Tell couples what wedding work you do (e.g. Wedding cakes, Nadaswaram).';
