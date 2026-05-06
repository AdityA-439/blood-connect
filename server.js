require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const Donor = require('./models/Donor');
const Request = require('./models/Request');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));
// ===== GET ALL DONORS =====
app.get("/api/donors", async (req, res) => {
  try {
    const { bloodGroup } = req.query;

    let donors;

    if (bloodGroup) {
      donors = await Donor.find({ bloodGroup });
    } else {
      donors = await Donor.find();
    }

    res.json(donors);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch donors" });
  }
});


// ===== GET ALL REQUESTS =====
app.get("/api/requests", async (req, res) => {
  try {
    const requests = await Request.find();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, token: ADMIN_PASSWORD });
  } else {
    res.status(401).json({ success: false, error: 'Invalid password' });
  }
});

function adminAuth(req, res, next) {
  const token = req.headers['authorization'];
  if (token === ADMIN_PASSWORD) {
    next();
  } else {
    res.status(403).json({ error: 'Unauthorized' });
  }
}

// ---------------------------
// Donor APIs
// ---------------------------

// Helper: Enforce 3-month rule
async function enforce3MonthRule(donors) {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  let changed = false;

  for (let d of donors) {
    if (d.lastDonatedAt) {
      if (d.lastDonatedAt > threeMonthsAgo && d.available === true) {
        d.available = false;
        await d.save();
        changed = true;
      } else if (d.lastDonatedAt <= threeMonthsAgo && d.available === false) {
        d.available = true;
        await d.save();
        changed = true;
      }
    }
  }
  return changed;
}

// Register donor
app.post('/api/donors', async (req, res) => {
  try {
    const { name, blood, pincode, phone } = req.body;
    const newDonor = new Donor({ name, blood, pincode, phone });
    await newDonor.save();
    res.status(201).json({ message: 'Donor registered successfully', donor: newDonor });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register donor' });
  }
});

// Get all donors (with optional bloodGroup filter)
app.get('/api/donors', async (req, res) => {
  try {
    const { bloodGroup } = req.query;
    const query = {};
    if (bloodGroup) query.blood = bloodGroup;

    let donors = await Donor.find(query).sort({ verified: -1, createdAt: -1 });
    if (await enforce3MonthRule(donors)) {
      donors = await Donor.find(query).sort({ verified: -1, createdAt: -1 });
    }
    res.json(donors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch donors' });
  }
});

// Filter donors
app.get('/api/donors/search', async (req, res) => {
  try {
    const { blood, pincode } = req.query;
    const query = {};
    if (blood) query.blood = blood;
    if (pincode) query.pincode = pincode;

    let donors = await Donor.find(query).sort({ verified: -1, createdAt: -1 });
    if (await enforce3MonthRule(donors)) {
      donors = await Donor.find(query).sort({ verified: -1, createdAt: -1 });
    }
    res.json(donors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search donors' });
  }
});

// Toggle availability (Admin controlled)
app.put('/api/donor/:id/toggle', adminAuth, async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.id);
    if (!donor) return res.status(404).json({ error: 'Donor not found' });

    let nextState = req.body.available !== undefined ? req.body.available : !donor.available;

    // Check 3 month rule if trying to set available = true
    if (nextState === true && donor.lastDonatedAt) {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      if (donor.lastDonatedAt > threeMonthsAgo) {
        return res.status(400).json({ error: 'Cannot mark available. Donor has donated within the last 3 months.' });
      }
    }

    donor.available = nextState;
    await donor.save();
    res.json({ message: 'Availability updated', donor });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle availability' });
  }
});

// Verify/unverify donor
app.put('/api/donor/:id/verify', adminAuth, async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.id);
    if (!donor) return res.status(404).json({ error: 'Donor not found' });

    donor.verified = !donor.verified;
    await donor.save();
    res.json({ message: 'Verification status updated', donor });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update verification' });
  }
});

// Mark donor as donated
app.put('/api/donor/:id/donate', adminAuth, async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.id);
    if (!donor) return res.status(404).json({ error: 'Donor not found' });

    donor.lastDonatedAt = new Date();
    donor.available = false; // automatically set unavailable
    await donor.save();
    res.json({ message: 'Donor marked as donated', donor });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as donated' });
  }
});

// Delete donor
app.delete('/api/donor/:id', adminAuth, async (req, res) => {
  try {
    await Donor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Donor deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete donor' });
  }
});

// ---------------------------
// Request APIs
// ---------------------------

// Create blood request
app.post('/api/request', async (req, res) => {
  try {
    const { name, blood, pincode, phone, urgency } = req.body;
    const newRequest = new Request({ name, blood, pincode, phone, urgency });
    await newRequest.save();
    res.status(201).json({ message: 'Blood request created successfully', request: newRequest });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// Get all requests
app.get('/api/request', async (req, res) => {
  try {
    // Sort so Emergency is at the top
    const requests = await Request.aggregate([
      {
        $addFields: {
          sortOrder: {
            $cond: { if: { $eq: ["$urgency", "Emergency"] }, then: 1, else: 2 }
          }
        }
      },
      { $sort: { sortOrder: 1, createdAt: -1 } }
    ]);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Delete request
app.delete('/api/request/:id', adminAuth, async (req, res) => {
  try {
    await Request.findByIdAndDelete(req.params.id);
    res.json({ message: 'Request deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete request' });
  }
});

// Fallback to index.html for unknown routes (SPA like behavior)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
