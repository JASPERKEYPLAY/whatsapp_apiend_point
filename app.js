// Import Express.js and native/installed dependencies
const express = require('express');
const app = express();

// Middleware to parse JSON bodies (Crucial for handling Meta's POST webhooks)
app.use(express.json());

// Set port and environment variables from Render configuration
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN; 
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN; 
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_ID; 

// ==========================================
// 1. HEALTH CHECK & ROOT ROUTE
// ==========================================
// Visiting https://your-app.onrender.com/ in a browser will hit this route.
// Use this to manually wake your server up before testing in Meta.
app.get('/', (req, res) => {
  res.status(200).json({
    status: "online",
    message: "WhatsApp Backend is live and running!",
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// 2. INBOUND WEBHOOK: VERIFICATION (GET)
// ==========================================
// Handles the initial connection challenge from the Meta Developer Dashboard.
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log("=== WEBHOOK VERIFICATION ATTEMPT ===");
  console.log(`Received mode: ${mode}`);
  console.log(`Received token from Meta: "${token}"`);
  console.log(`Expected token from Render Env: "${VERIFY_TOKEN}"`);

  // Check if the query matches criteria
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ WEBHOOK VERIFIED SUCCESSFULLY!');
    // Meta requires you to send back the EXACT challenge string as plain text
    return res.status(200).send(challenge);
  } else {
    console.log('❌ VERIFICATION FAILED: Token mismatch or invalid mode.');
    return res.status(403).send('Verification failed: Tokens do not match.');
  }
});

// ==========================================
// 3. INBOUND WEBHOOK: RECEIVE MESSAGES (POST)
// ==========================================
// Handles live messages, replies, and status updates sent by Meta.
app.post('/webhook', (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  
  console.log(`\n\n📩 Webhook Received [${timestamp}]`);
  console.log(JSON.stringify(req.body, null, 2));

  // Acknowledge receipt to Meta immediately (Must return 200 OK within 3 seconds)
  res.status(200).end();
});

// ==========================================
// 4. OUTBOUND API: SEND MESSAGE (POST)
// ==========================================
// Your Next.js admin panel will make a POST request here to send WhatsApp messages.
app.post('/api/send-message', async (req, res) => {
  const { to, message } = req.body;

  // Basic payload validation
  if (!to || !message) {
    return res.status(400).json({ success: false, error: 'Missing "to" or "message" field.' });
  }

  try {
    // Send request out to Meta's Graph API
    const metaResponse = await fetch(`https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: message },
      }),
    });

    const data = await metaResponse.json();

    if (!metaResponse.ok) {
      throw new Error(data.error?.message || 'Meta API returned an error.');
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('❌ Outbound Message Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`\n🚀 Server actively listening on port ${PORT}\n`);
});