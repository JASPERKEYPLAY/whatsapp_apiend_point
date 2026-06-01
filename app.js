const express = require('express');
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN; // Set this on Render (e.g., 'vibecode')

// ==========================================
// 1. HEALTH CHECK ROUTE
// ==========================================
// Visit https://your-app.onrender.com/ in your browser to wake up Render.
app.get('/', (req, res) => {
  res.status(200).send("Server is awake and waiting for Meta.");
});

// ==========================================
// 2. INBOUND WEBHOOK: VERIFICATION ONLY (GET)
// ==========================================
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log("=== WEBHOOK VERIFICATION ATTEMPT ===");
  console.log(`Received token from Meta: "${token}"`);
  console.log(`Expected token from Render: "${VERIFY_TOKEN}"`);

  // Check if Meta's request matches your token string
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ WEBHOOK VERIFIED SUCCESSFULLY!');
    // Return the exact challenge string back to Meta as plain text
    return res.status(200).send(challenge);
  } else {
    console.log('❌ VERIFICATION FAILED: Token mismatch.');
    return res.status(403).send('Verification failed.');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Verification server listening on port ${PORT}`);
});