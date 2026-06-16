/**
 * Shared HobbieTrades API helpers — include before page scripts.
 */
(function (global) {
  const API =
    global.location.hostname.includes('localhost') ||
    global.location.hostname === '127.0.0.1'
      ? 'http://localhost:8080'
      : 'https://hobbietrades-backend.onrender.com';

  let wakePromise = null;

  function wakeBackend() {
    if (wakePromise) return wakePromise;
    wakePromise = fetch(`${API}/api/health`, { method: 'GET' })
      .then((r) => r.ok)
      .catch(() => false);
    return wakePromise;
  }

  function getAuthHeaders() {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return headers;
  }

  global.HobbieAPI = {
    baseUrl: API,
    wakeBackend,
    getAuthHeaders,
    resolveImageUrl(photoUrl, itemId) {
      if (!photoUrl) {
        return itemId ? `${API}/api/items/${itemId}/photo` : null;
      }
      if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) return photoUrl;
      if (photoUrl.startsWith('/api/') || photoUrl.startsWith('/uploads/')) return API + photoUrl;
      return API + (photoUrl.startsWith('/') ? photoUrl : '/' + photoUrl);
    },
  };

  wakeBackend();
})(window);
