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
    async deleteListing(itemId) {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        window.location.href = 'index.html';
        return { success: false };
      }
      if (!confirm('Remove this listing? It will no longer appear in browse.')) {
        return { success: false, cancelled: true };
      }
      const res = await fetch(`${API}/api/items/${itemId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: parseInt(userId, 10) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Could not remove listing.');
      }
      return data;
    },
    resolveImageUrl(photoUrl, itemId) {
      if (!photoUrl) {
        return itemId ? `${API}/api/items/${itemId}/photo` : null;
      }
      if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) return photoUrl;
      if (photoUrl.startsWith('/api/') || photoUrl.startsWith('/uploads/')) return API + photoUrl;
      return API + (photoUrl.startsWith('/') ? photoUrl : '/' + photoUrl);
    },
    resolveGalleryUrls(item) {
      if (!item || !item.id) return [];
      if (item.galleryUrls) {
        return item.galleryUrls.split('|').filter(Boolean).map((u) => {
          if (u.startsWith('http://') || u.startsWith('https://')) return u;
          if (u.startsWith('/api/') || u.startsWith('/uploads/')) return API + u;
          return API + (u.startsWith('/') ? u : '/' + u);
        });
      }
      return [1, 2, 3, 4, 5].map((slot) => `${API}/api/items/${item.id}/gallery/${slot}`);
    },
  };

  wakeBackend();
})(window);
