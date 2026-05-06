const API_URL = "https://blood-connect-backend-he01.onrender.com/api";

// REGISTER DONOR
const registerForm = document.getElementById('register-form');

if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(registerForm);
    const data = Object.fromEntries(formData);

    try {
      const res = await fetch(`${API_URL}/donors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        alert("Donor registered successfully ✅");
        registerForm.reset();
      } else {
        alert("Failed to register ❌");
      }

    } catch (err) {
      alert("Server error ❌");
      console.error(err);
    }
  });
}

// FIND DONORS
const findForm = document.getElementById('find-form');

if (findForm) {
  findForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const blood = document.getElementById('blood').value;

    try {
      const res = await fetch(`${API_URL}/donors?bloodGroup=${blood}`);
      const data = await res.json();

      alert(`Found ${data.length} donors ✅`);

      // Keep visual rendering if possible
      const donorGrid = document.getElementById('donor-grid');
      if (donorGrid) {
        donorGrid.innerHTML = '';
        if (data.length === 0) {
          donorGrid.innerHTML = '<p>No donors found matching criteria.</p>';
          return;
        }
        data.forEach(donor => {
          donorGrid.innerHTML += `
            <div class="card">
              <div class="card-header"><div class="card-title">${donor.name}</div><div class="blood-badge">${donor.blood}</div></div>
              <div class="card-body">
                <p><strong>Phone:</strong> ${donor.phone}</p>
                <p><strong>Pincode:</strong> ${donor.pincode}</p>
              </div>
            </div>`;
        });
      }

    } catch (err) {
      alert("Error fetching donors ❌");
      console.error(err);
    }
  });
}
