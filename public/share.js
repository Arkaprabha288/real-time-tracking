const statusText = document.getElementById('share-status');
const sessionId = window.location.pathname.split('/').pop();

if (!sessionId) {
  statusText.textContent = 'Invalid tracking link.';
} else if (!('geolocation' in navigator)) {
  statusText.textContent = 'Geolocation is not supported on this device.';
} else {
  statusText.textContent = 'Location permission check in progress...';

  navigator.geolocation.watchPosition(
    async (position) => {
      statusText.textContent = 'Live location sharing is active ✅';

      const payload = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now()
      };

      try {
        await fetch(`/api/location/${sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (_error) {
        statusText.textContent = 'Could not send location, retrying...';
      }
    },
    (error) => {
      if (error.code === error.PERMISSION_DENIED) {
        statusText.textContent = 'Location permission denied.';
      } else {
        statusText.textContent = 'Unable to read location right now.';
      }
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000
    }
  );
}
