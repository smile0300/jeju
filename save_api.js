async function test() {
  try {
    const url = 'https://api.visitjeju.net/vsjApi/contents/searchList?locale=kr&category=c5&apiKey=fd0365a6919e44c3b120034ba100678f&pageSize=50';
    const res = await fetch(url);
    const data = await res.json();
    const fs = require('fs');
    fs.writeFileSync('api_response_full.json', JSON.stringify(data, null, 2));
    console.log('Saved to api_response_full.json');
  } catch (e) {
    console.error(e.message);
  }
}
test();
