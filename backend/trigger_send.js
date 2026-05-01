const http = require('http');

const data = JSON.stringify({
    numbers: '9074300719',
    message: 'Hello! This is a test message from Antigravity.'
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/send',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

const req = http.request(options, (res) => {
    let response = '';
    res.on('data', (chunk) => { response += chunk; });
    res.on('end', () => { console.log('Response:', response); });
});

req.on('error', (error) => { console.error('Error:', error); });
req.write(data);
req.end();
