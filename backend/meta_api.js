const https = require('https');

const sendMetaMessage = (to, message, accessToken, phoneNumberId) => {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            messaging_product: "whatsapp",
            to: to,
            type: "text",
            text: { body: message }
        });

        const options = {
            hostname: 'graph.facebook.com',
            path: `/v19.0/${phoneNumberId}/messages`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => { responseBody += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(responseBody));
                } else {
                    reject(new Error(`Status ${res.statusCode}: ${responseBody}`));
                }
            });
        });

        req.on('error', (e) => { reject(e); });
        req.write(data);
        req.end();
    });
};

module.exports = { sendMetaMessage };
