// Include the existing admin CSRF cookie when this browser also uses customer checkout.
export function createPaymentHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (typeof document !== 'undefined') {
    const cookie = document.cookie.split(';').map(value => value.trim()).find(value => value.startsWith('csrf_token='));
    if (cookie) {
      try { headers['X-CSRF-Token'] = decodeURIComponent(cookie.slice('csrf_token='.length)); } catch {}
    }
  }
  return headers;
}
