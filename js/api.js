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

    /** ESP32 live preview — polls /api/esp32/preview/frame into the given <img>. */
    async startEsp32Session(imgElement) {
      await wakeBackend();

      const health = await fetch(`${API}/api/esp32/preview/health`, { cache: 'no-store' })
        .then((r) => r.json())
        .catch(() => ({}));

      if (health.deviceConfigured === false) {
        throw new Error(
          'ESP32 device key is not set on the server. Add ESP32_DEVICE_KEY on Render and redeploy.'
        );
      }

      const res = await fetch(`${API}/api/esp32/preview/start`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Could not start ESP32 preview session.');
      }

      esp32State.sessionId = data.session;
      esp32State.frameSince = 0;
      esp32State.imgEl = imgElement;
      esp32State.framesSeen = 0;
      startEsp32FramePolling();

      return data.session;
    },

    async stopEsp32Session() {
      stopEsp32FramePolling();
      esp32State.imgEl = null;
      esp32State.sessionId = null;
      try {
        await fetch(`${API}/api/esp32/preview/stop`, { method: 'POST' });
      } catch (_) {
        /* ignore */
      }
    },

    async getEsp32Health() {
      const res = await fetch(`${API}/api/esp32/preview/health`, { cache: 'no-store' });
      return res.json().catch(() => ({}));
    },

    /** Ask ESP32 to capture, then poll /api/esp32/latest until the JPEG arrives. */
    async captureEsp32Photo() {
      const res = await fetch(`${API}/api/esp32/capture/request`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Could not request capture from ESP32.');
      }

      const since = Date.now() - 5000;
      const deadline = Date.now() + 90000;

      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 800));
        const latest = await fetch(`${API}/api/esp32/latest?since=${since}`, { cache: 'no-store' })
          .then((r) => r.json())
          .catch(() => ({}));
        if (latest.available && latest.imageBase64) {
          return base64ToBlob(latest.imageBase64, latest.mimeType || 'image/jpeg');
        }
      }

      throw new Error(
        'Timed out waiting for ESP32 photo. Check Serial Monitor for "Capture requested" and upload errors.'
      );
    },
  };

  const esp32State = {
    pollTimer: null,
    healthTimer: null,
    frameSince: 0,
    sessionId: null,
    imgEl: null,
    framesSeen: 0,
    onHealth: null,
  };

  function base64ToBlob(b64, mime) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  function stopEsp32FramePolling() {
    if (esp32State.pollTimer) {
      clearInterval(esp32State.pollTimer);
      esp32State.pollTimer = null;
    }
    if (esp32State.healthTimer) {
      clearInterval(esp32State.healthTimer);
      esp32State.healthTimer = null;
    }
  }

  async function pollEsp32PreviewFrame() {
    try {
      const res = await fetch(
        `${API}/api/esp32/preview/frame?since=${esp32State.frameSince}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (data.available && data.imageBase64 && esp32State.imgEl) {
        esp32State.frameSince = data.updatedAt;
        esp32State.framesSeen += 1;
        esp32State.imgEl.src = `data:${data.mimeType || 'image/jpeg'};base64,${data.imageBase64}`;
      }
    } catch (_) {
      /* retry on next tick */
    }
  }

  function startEsp32FramePolling() {
    stopEsp32FramePolling();
    pollEsp32PreviewFrame();
    esp32State.pollTimer = setInterval(pollEsp32PreviewFrame, 280);
    esp32State.healthTimer = setInterval(async () => {
      if (typeof esp32State.onHealth !== 'function') return;
      try {
        const health = await fetch(`${API}/api/esp32/preview/health`, { cache: 'no-store' }).then(
          (r) => r.json()
        );
        esp32State.onHealth(health, esp32State.framesSeen);
      } catch (_) {
        /* ignore */
      }
    }, 2000);
  }

  global.HobbieAPI._esp32State = esp32State;

  wakeBackend();
})(window);
