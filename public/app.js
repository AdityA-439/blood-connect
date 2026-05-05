// Configuration
// Replace this with your actual Render backend URL
const API_URL = 'https://YOUR_BACKEND_NAME.onrender.com/api';

// Utility: Show Toast Notification
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  document.body.appendChild(container);
  return container;
}

// Utility: Format Date
function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
}

function formatDate(dateString) {
  const options = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('en-GB', options);
}

// ------------------------------------------------------------------
// Pages logic
// ------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  // Register Form
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(registerForm);
      const data = Object.fromEntries(formData);
      
      try {
        const res = await fetch(`${API_URL}/donor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (res.ok) {
          showToast('Donor registered successfully');
          registerForm.reset();
        } else {
          showToast('Failed to register donor', 'error');
        }
      } catch (err) {
        showToast('Error connecting to server', 'error');
      }
    });
  }

  // Request Form
  const requestForm = document.getElementById('request-form');
  if (requestForm) {
    requestForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(requestForm);
      const data = Object.fromEntries(formData);
      
      try {
        const res = await fetch(`${API_URL}/request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (res.ok) {
          showToast('Blood request created successfully');
          requestForm.reset();
        } else {
          showToast('Failed to create request', 'error');
        }
      } catch (err) {
        showToast('Error connecting to server', 'error');
      }
    });
  }

  // Find Page
  const donorGrid = document.getElementById('donor-grid');
  if (donorGrid) {
    loadDonorsForFind();

    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        const blood = document.getElementById('search-blood').value;
        const pincode = document.getElementById('search-pincode').value;
        loadDonorsForFind(blood, pincode);
      });
    }
  }

  // Admin Login Form
  const adminLoginForm = document.getElementById('admin-login-form');
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('password').value;
      try {
        const res = await fetch(`${API_URL}/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('adminToken', data.token);
          window.location.href = 'admin.html';
        } else {
          showToast('Invalid password', 'error');
        }
      } catch (err) {
        showToast('Error logging in', 'error');
      }
    });
  }

  // Admin Page
  const adminDonorsTable = document.getElementById('admin-donors-body');
  const adminRequestsTable = document.getElementById('admin-requests-body');
  if (adminDonorsTable && adminRequestsTable) {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      window.location.href = 'admin-login.html';
    } else {
      loadAdminData();
    }
  }
});

function logoutAdmin() {
  localStorage.removeItem('adminToken');
  window.location.href = 'admin-login.html';
}

// Load Donors for Find Page
async function loadDonorsForFind(blood = '', pincode = '') {
  const donorGrid = document.getElementById('donor-grid');
  let url = `${API_URL}/donor/search`;
  if (blood || pincode) {
    const params = new URLSearchParams();
    if (blood) params.append('blood', blood);
    if (pincode) params.append('pincode', pincode);
    url += `?${params.toString()}`;
  }

  try {
    const res = await fetch(url);
    const donors = await res.json();
    
    donorGrid.innerHTML = '';
    if (donors.length === 0) {
      donorGrid.innerHTML = '<p>No donors found matching criteria.</p>';
      return;
    }

    donors.forEach(donor => {
      const card = document.createElement('div');
      card.className = 'card';
      
      let badgesHtml = '';
      if (donor.available) {
        badgesHtml += `<span class="badge badge-success">🟢 Available</span> `;
      } else {
        badgesHtml += `<span class="badge badge-danger">⚠️ Not Available</span> `;
      }

      if (donor.verified) {
        badgesHtml += `<span class="badge badge-info">✅ Verified</span> `;
      }

      let donationInfo = '';
      if (donor.lastDonatedAt) {
        donationInfo = `
          <div class="mt-2">
            <span class="badge badge-warning">Recently Donated</span>
            <small class="text-muted d-block mt-1">🕒 Last Donated: ${formatDate(donor.lastDonatedAt)} (${timeAgo(donor.lastDonatedAt)})</small>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="card-header">
          <div class="card-title">${donor.name}</div>
          <div class="blood-badge">${donor.blood}</div>
        </div>
        <div class="card-body">
          <p><strong>Phone:</strong> ${donor.phone}</p>
          <p><strong>Pincode:</strong> ${donor.pincode}</p>
          <div class="mb-2">
            ${badgesHtml}
          </div>
          ${donationInfo}
        </div>
      `;
      donorGrid.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    showToast('Failed to load donors', 'error');
  }
}

// Admin API Actions
async function toggleAvailability(id, currentStatus) {
  try {
    const res = await fetch(`${API_URL}/donor/${id}/toggle`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': localStorage.getItem('adminToken')
      },
      body: JSON.stringify({ available: !currentStatus })
    });
    if (res.status === 403) return logoutAdmin();
    if (res.status === 400) {
      const data = await res.json();
      return showToast(data.error, 'error');
    }
    showToast('Availability updated');
    loadAdminData();
  } catch (err) {
    showToast('Failed to update availability', 'error');
  }
}

async function verifyDonor(id) {
  try {
    const res = await fetch(`${API_URL}/donor/${id}/verify`, { 
      method: 'PUT',
      headers: { 'Authorization': localStorage.getItem('adminToken') }
    });
    if (res.status === 403) return logoutAdmin();
    showToast('Verification status updated');
    loadAdminData();
  } catch (err) {
    showToast('Failed to update verification', 'error');
  }
}

async function markDonated(id) {
  if (!confirm('Are you sure you want to mark this donor as having donated? This will set them to Not Available.')) return;
  
  try {
    const res = await fetch(`${API_URL}/donor/${id}/donate`, { 
      method: 'PUT',
      headers: { 'Authorization': localStorage.getItem('adminToken') }
    });
    if (res.status === 403) return logoutAdmin();
    showToast('Donation recorded successfully');
    loadAdminData();
  } catch (err) {
    showToast('Failed to mark as donated', 'error');
  }
}

async function deleteDonor(id) {
  if (!confirm('Are you sure you want to delete this donor?')) return;
  try {
    const res = await fetch(`${API_URL}/donor/${id}`, { 
      method: 'DELETE',
      headers: { 'Authorization': localStorage.getItem('adminToken') }
    });
    if (res.status === 403) return logoutAdmin();
    showToast('Donor deleted successfully');
    loadAdminData();
  } catch (err) {
    showToast('Failed to delete donor', 'error');
  }
}

async function deleteRequest(id) {
  if (!confirm('Are you sure you want to delete this request?')) return;
  try {
    const res = await fetch(`${API_URL}/request/${id}`, { 
      method: 'DELETE',
      headers: { 'Authorization': localStorage.getItem('adminToken') }
    });
    if (res.status === 403) return logoutAdmin();
    showToast('Request deleted successfully');
    loadAdminData();
  } catch (err) {
    showToast('Failed to delete request', 'error');
  }
}

// Load Admin Data
async function loadAdminData() {
  try {
    // Fetch Donors
    const donorsRes = await fetch(`${API_URL}/donor`);
    const donors = await donorsRes.json();
    
    const donorsBody = document.getElementById('admin-donors-body');
    if (donorsBody) {
      donorsBody.innerHTML = donors.map(donor => `
        <tr>
          <td>${donor.name}</td>
          <td><span class="blood-badge">${donor.blood}</span></td>
          <td>${donor.phone}</td>
          <td>${donor.pincode}</td>
          <td>
            <span class="badge ${donor.available ? 'badge-success' : 'badge-danger'}">
              ${donor.available ? 'Available' : 'Not Available'}
            </span>
          </td>
          <td>
            <span class="badge ${donor.verified ? 'badge-info' : 'badge-secondary'}">
              ${donor.verified ? 'Verified' : 'Unverified'}
            </span>
          </td>
          <td>
            ${donor.lastDonatedAt ? formatDate(donor.lastDonatedAt) : 'Never'}
          </td>
          <td>
            <div class="actions">
              <button class="btn btn-small ${donor.available ? 'btn-danger' : 'btn-success'}" onclick="toggleAvailability('${donor._id}', ${donor.available})">
                Set ${donor.available ? 'Not Available' : 'Available'}
              </button>
              <button class="btn btn-small btn-info" onclick="verifyDonor('${donor._id}')">
                ${donor.verified ? 'Unverify' : 'Verify'}
              </button>
              <button class="btn btn-small btn-warning" onclick="markDonated('${donor._id}')">Mark Donated</button>
              <button class="btn btn-small btn-danger" onclick="deleteDonor('${donor._id}')">Delete</button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    // Fetch Requests
    const reqRes = await fetch(`${API_URL}/request`);
    const requests = await reqRes.json();
    
    const requestsBody = document.getElementById('admin-requests-body');
    if (requestsBody) {
      requestsBody.innerHTML = requests.map(req => `
        <tr style="${req.urgency === 'Emergency' ? 'background-color: rgba(255, 71, 87, 0.05); border-left: 4px solid var(--danger);' : ''}">
          <td>${req.name}</td>
          <td><span class="blood-badge">${req.blood}</span></td>
          <td>${req.phone}</td>
          <td>${req.pincode}</td>
          <td>
            <span class="badge ${req.urgency === 'Emergency' ? 'badge-danger' : 'badge-secondary'}">
              ${req.urgency === 'Emergency' ? '🔴 Emergency' : 'Normal'}
            </span>
          </td>
          <td>${formatDate(req.createdAt)}</td>
          <td>
            <div class="actions">
              <button class="btn btn-small btn-success" onclick="deleteRequest('${req._id}')">Mark Completed / Delete</button>
            </div>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error(err);
    showToast('Failed to load admin data', 'error');
  }
}

// Make functions available globally for onclick handlers
window.toggleAvailability = toggleAvailability;
window.verifyDonor = verifyDonor;
window.markDonated = markDonated;
window.deleteDonor = deleteDonor;
window.deleteRequest = deleteRequest;
window.logoutAdmin = logoutAdmin;
