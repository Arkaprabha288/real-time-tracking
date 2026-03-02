const createButton = document.getElementById('create-link');
const linkInput = document.getElementById('tracking-link');
const statusText = document.getElementById('status');
const coordsText = document.getElementById('coords');

let activeSource;

function connectDashboardStream(sessionId) {
  if (activeSource) activeSource.close();

  activeSource = new EventSource(`/api/dashboard-stream/${sessionId}`);
  statusText.textContent = 'Listening for live updates...';

  activeSource.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type !== 'location') return;

    const { latitude, longitude, accuracy, timestamp } = message.point;
    coordsText.textContent = `Lat ${latitude.toFixed(6)}, Lng ${longitude.toFixed(6)} • ±${Math.round(accuracy)}m`;
    statusText.textContent = `Last update: ${new Date(timestamp).toLocaleTimeString()}`;
  };

  activeSource.onerror = () => {
    statusText.textContent = 'Disconnected. Trying to reconnect...';
  };
}

createButton.addEventListener('click', async () => {
  createButton.disabled = true;
  statusText.textContent = 'Creating session...';

  try {
    const response = await fetch('/api/session', { method: 'POST' });
    const data = await response.json();

    linkInput.value = data.trackingLink;
    statusText.textContent = 'Share the link. Waiting for location...';
    connectDashboardStream(data.id);
  } catch (_error) {
    statusText.textContent = 'Could not create session.';
  } finally {
    createButton.disabled = false;
  }
});
