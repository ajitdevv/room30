// Format a listing_number as #00001 (zero-padded to 5 digits).
export function formatListingNumber(n) {
  if (n == null) return '';
  return '#' + String(n).padStart(5, '0');
}
