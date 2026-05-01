const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Initialize Express
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Middleware
app.use(cors());
app.use(express.json());

// Set up storage for Multer
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// We'll require whatsapp manager later
const { initializeWhatsApp, getClientStatus, getQrCode, addMessageToQueue, checkNumbers, logoutWhatsApp } = require('./whatsapp')(io);

// API Routes
const { sendMetaMessage } = require('./meta_api');

app.post('/api/send-meta', async (req, res) => {
  const { numbers, message, accessToken, phoneNumberId } = req.body;
  
  if (!numbers || !message || !accessToken || !phoneNumberId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  let numbersList = Array.isArray(numbers) ? numbers : [numbers];
  
  const results = [];
  for (const number of numbersList) {
    try {
      const cleanNumber = number.toString().replace(/\D/g, '');
      const response = await sendMetaMessage(cleanNumber, message, accessToken, phoneNumberId);
      results.push({ number, status: 'Sent', response });
    } catch (error) {
      results.push({ number, status: 'Failed', error: error.message });
    }
  }
  
  res.json({ message: 'Campaign processed', results });
});

app.get('/api/status', (req, res) => {
  res.json({ status: getClientStatus(), qr: getQrCode() });
});

app.post('/api/start', (req, res) => {
  initializeWhatsApp();
  res.json({ message: 'WhatsApp initialization started' });
});

app.post('/api/logout', async (req, res) => {
  await logoutWhatsApp();
  res.json({ message: 'WhatsApp logged out' });
});


app.post('/api/check', async (req, res) => {
  const { numbers } = req.body;
  if (!numbers) return res.status(400).json({ error: 'Numbers are required' });
  
  let numbersList = [];
  try {
    const parsed = Array.isArray(numbers) ? numbers : JSON.parse(numbers);
    numbersList = Array.isArray(parsed) ? parsed : [parsed];
  } catch(e) {
    numbersList = numbers.split(',').map(n => n.trim()).filter(n => n !== '');
  }

  const results = await checkNumbers(numbersList);
  res.json(results);
});

const csv = require('csv-parser');

app.post('/api/upload-csv', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      // Extract numbers from the CSV
      // Look for common column names: number, phone, mobile, or just take the first column
      const numbers = results.map(row => {
        const keys = Object.keys(row);
        const phoneKey = keys.find(k => /phone|number|mobile/i.test(k)) || keys[0];
        return row[phoneKey];
      }).filter(n => n);

      // Clean up the uploaded file
      fs.unlinkSync(req.file.path);
      
      res.json({ numbers });
    });
});

app.get('/api/download-sample', (req, res) => {
  const csvContent = "name,number\nJohn Doe,919074300719\nJane Smith,918765432109";
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=sample_audience.csv');
  res.status(200).send(csvContent);
});

app.get('/api/templates', (req, res) => {
  const templatePath = path.join(__dirname, 'templates.json');
  if (fs.existsSync(templatePath)) {
    try {
      const templates = JSON.parse(fs.readFileSync(templatePath));
      res.json(templates);
    } catch (e) {
      res.json([]);
    }
  } else {
    res.json([]);
  }
});

app.post('/api/templates', (req, res) => {
  const { name, content } = req.body;
  if (!name || !content) return res.status(400).json({ error: 'Name and content required' });

  const templatePath = path.join(__dirname, 'templates.json');
  let templates = [];
  if (fs.existsSync(templatePath)) {
    try {
      templates = JSON.parse(fs.readFileSync(templatePath));
    } catch (e) {}
  }
  
  templates.push({ id: Date.now(), name, content });
  fs.writeFileSync(templatePath, JSON.stringify(templates, null, 2));
  res.json({ message: 'Template saved', templates });
});

app.get('/api/logs', (req, res) => {
  const logPath = path.join(__dirname, 'logs.json');
  if (fs.existsSync(logPath)) {
    try {
      const logs = JSON.parse(fs.readFileSync(logPath));
      res.json(logs);
    } catch (e) {
      res.json([]);
    }
  } else {
    res.json([]);
  }
});

app.post('/api/send', upload.single('media'), (req, res) => {

  const { numbers, message, minDelay, maxDelay } = req.body;
  const mediaPath = req.file ? req.file.path : null;
  
  if (!numbers || !message) {
    return res.status(400).json({ error: 'Numbers and message are required' });
  }

  let numbersList = [];
  try {
    const parsed = JSON.parse(numbers);
    numbersList = Array.isArray(parsed) ? parsed : [parsed];
  } catch(e) {
    numbersList = numbers.split(',').map(n => n.trim()).filter(n => n !== '');
  }

  const delayConfig = {
    min: parseInt(minDelay) || 10,
    max: parseInt(maxDelay) || 20
  };

  // Add to queue
  addMessageToQueue({ numbers: numbersList, message, mediaPath, delayConfig });
  
  res.json({ message: 'Added to send queue', total: numbersList.length });
});

const PORT = process.env.PORT || 3001;
const VERIFY_TOKEN = 'WP_TOOL_VERIFY_TOKEN_2026';

// Meta Webhook Verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// Meta Webhook Notifications
app.post('/webhook', (req, res) => {
  const body = req.body;
  console.log('Webhook Received:', JSON.stringify(body, null, 2));

  if (body.object) {
    if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from;
      const text = message.text ? message.text.body : '';
      
      console.log(`Received message from ${from}: ${text}`);
      io.emit('new_message', { from, text, timestamp: new Date() });
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});
// Deployment: Serve frontend static files
const frontendPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
