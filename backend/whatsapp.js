const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');

module.exports = function(io) {
  let client = null;
  let status = 'DISCONNECTED';
  let qrCodeData = null;
  let isInitializing = false;
  let messageQueue = [];
  let isSending = false;

  const getClientStatus = () => status;
  const getQrCode = () => qrCodeData;

  const initializeWhatsApp = async () => {
    if (isInitializing || status === 'CONNECTED') return;
    
    isInitializing = true;
    status = 'INITIALIZING';
    qrCodeData = null;
    io.emit('status', { status });

    if (client) {
      console.log('Client already exists, destroying old one...');
      try { await client.destroy(); } catch(e) {}
    }

    client = new Client({
      authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-js/main/dist/wppconnect-wa.js'
      },
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-extensions'
        ]
      }
    });


    client.on('qr', (qr) => {
      console.log('QR RECEIVED');
      qrCodeData = qr;
      status = 'QR_READY';
      io.emit('qr', qr);
      io.emit('status', { status });
    });

    client.on('ready', () => {
      console.log('Client is ready!');
      status = 'CONNECTED';
      qrCodeData = null;
      io.emit('status', { status });
    });

    client.on('authenticated', () => {
      console.log('AUTHENTICATED');
    });

    client.on('auth_failure', msg => {
      console.error('AUTHENTICATION FAILURE', msg);
      status = 'AUTH_FAILED';
      isInitializing = false;
      io.emit('status', { status });
    });

    client.on('disconnected', (reason) => {
      console.log('Client was logged out', reason);
      status = 'DISCONNECTED';
      isInitializing = false;
      client = null;
      io.emit('status', { status });
    });
    
    client.on('message', async msg => {
        if(msg.body.toLowerCase() === 'price') {
            await msg.reply('Only ₹499 today 🔥');
        }
    });

    client.initialize().catch(err => {
      console.error('Initialization error:', err);
      status = 'DISCONNECTED';
      isInitializing = false;
      io.emit('status', { status });
    });
  };

  const checkNumbers = async (numbers) => {
    if (status !== 'CONNECTED') return { error: 'WhatsApp not connected' };
    
    const results = [];
    for (const number of numbers) {
      const target = formatNumber(number);
      try {
        const isRegistered = await client.isRegisteredUser(target);
        results.push({ number, exists: isRegistered });
      } catch (err) {
        results.push({ number, exists: false, error: err.message });
      }
    }
    return results;
  };

  const getRandomDelay = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min) * 1000;
  };

  const formatNumber = (number) => {
    let clean = number.toString().replace(/\D/g, '');
    if (clean.length === 10) clean = `91${clean}`;
    return `${clean}@c.us`;
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const getPendingCount = () => {
    let count = 0;
    messageQueue.forEach(task => { count += task.numbers.length; });
    return count;
  };

  const addMessageToQueue = ({ numbers, message, mediaPath, delayConfig }) => {
    messageQueue.push({ numbers, message, mediaPath, delayConfig });
    io.emit('pending_count', { count: getPendingCount() });
    if (!isSending) {
      processQueue();
    }
  };

  const saveLog = (log) => {
    const logPath = path.join(__dirname, 'logs.json');
    let logs = [];
    if (fs.existsSync(logPath)) {
      try {
        logs = JSON.parse(fs.readFileSync(logPath));
      } catch (e) {
        logs = [];
      }
    }
    logs.unshift(log);
    // Keep only last 1000 logs
    if (logs.length > 1000) logs = logs.slice(0, 1000);
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
  };

  const processQueue = async () => {
    if (messageQueue.length === 0) {
      isSending = false;
      io.emit('pending_count', { count: 0 });
      return;
    }

    if (status !== 'CONNECTED') {
      console.log('Cannot send: WhatsApp not connected');
      setTimeout(processQueue, 5000);
      return;
    }

    isSending = true;
    const task = messageQueue.shift();
    const { numbers, message, mediaPath, delayConfig } = task;

    let media = null;
    if (mediaPath) {
      try {
        media = MessageMedia.fromFilePath(mediaPath);
      } catch (e) {
        console.error('Media loading failed', e);
      }
    }

    for (let i = 0; i < numbers.length; i++) {
      const rawNumber = numbers[i];
      const targetNumber = formatNumber(rawNumber);
      
      const currentPending = (numbers.length - 1 - i) + getPendingCount();
      io.emit('pending_count', { count: currentPending });

      try {
        console.log(`Sending to ${targetNumber}...`);
        
        if (media) {
          await client.sendMessage(targetNumber, media, { caption: message });
        } else {
          await client.sendMessage(targetNumber, message);
        }
        
        const logData = { number: rawNumber, status: 'Sent', timestamp: new Date() };
        io.emit('send_status', logData);
        saveLog(logData);
        console.log(`Successfully sent to ${rawNumber}`);
      } catch (err) {
        console.error(`Failed to send to ${rawNumber}:`, err.message);
        const logData = { number: rawNumber, status: 'Failed', error: err.message, timestamp: new Date() };
        io.emit('send_status', logData);
        saveLog(logData);
      }

      if (i < numbers.length - 1) {
        const delayMs = getRandomDelay(delayConfig.min, delayConfig.max);
        console.log(`Waiting ${delayMs/1000}s before next message...`);
        io.emit('queue_progress', { waiting: delayMs, nextNumber: numbers[i+1] });
        await sleep(delayMs);
      }
    }

    processQueue();
  };


  const logoutWhatsApp = async () => {
    if (client) {
      try {
        await client.logout();
        await client.destroy();
      } catch (e) {
        console.error('Logout error:', e);
      }
      client = null;
    }
    status = 'DISCONNECTED';
    qrCodeData = null;
    isInitializing = false;
    io.emit('status', { status });
  };

  return {
    initializeWhatsApp,
    getClientStatus,
    getQrCode,
    addMessageToQueue,
    checkNumbers,
    logoutWhatsApp
  };
};


