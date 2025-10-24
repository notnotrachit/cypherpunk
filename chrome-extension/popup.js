// Popup script
const API_BASE_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', async () => {
  await loadStatus();
  
  document.getElementById('refresh-btn').addEventListener('click', async () => {
    document.getElementById('refresh-btn').textContent = 'Refreshing...';
    await loadStatus();
    document.getElementById('refresh-btn').textContent = 'Refresh Status';
  });
});

async function loadStatus() {
  try {
    // Try to fetch user info directly (will work if cookies are accessible)
    const response = await fetch(`${API_BASE_URL}/api/user/me`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      document.getElementById('wallet').textContent = 
        data.wallet.slice(0, 6) + '...' + data.wallet.slice(-4);
      document.getElementById('status-badge').textContent = 'Connected';
      document.getElementById('status-badge').className = 'status-badge connected';
    } else {
      // Not authenticated
      document.getElementById('wallet').textContent = 'Not Connected';
      document.getElementById('status-badge').textContent = 'Disconnected';
      document.getElementById('status-badge').className = 'status-badge disconnected';
    }
    
    // Get network info
    const networkResponse = await fetch(`${API_BASE_URL}/api/network-info`);
    if (networkResponse.ok) {
      const networkData = await networkResponse.json();
      document.getElementById('network').textContent = networkData.network;
    }
  } catch (error) {
    console.error('Error loading status:', error);
    document.getElementById('wallet').textContent = 'Error';
    document.getElementById('status-badge').textContent = 'Error';
    document.getElementById('status-badge').className = 'status-badge disconnected';
  }
}
