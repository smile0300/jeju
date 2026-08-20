const https = require('https');

const API_KEY = 'fd0365a6919e44c3b120034ba100678f'; // I'll just try this key in case it's shared, or without key to see the error.
const url = `https://apis.data.go.kr/B551178/flight-status/getArrFlightStatusList?pageNo=1&numOfRows=10&searchday=20240101`;

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('Status:', res.statusCode, '\nBody:', data));
}).on('error', err => console.error(err));
