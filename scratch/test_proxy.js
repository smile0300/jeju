const GAS_URL = 'https://script.google.com/macros/s/AKfycbyg_7wPmQwOtHrPXSHOaSm4Erwo7Z_Os5jgmNg-d32mxb6CCFNja9MbpvWFLEg7CDPk/exec';

const locations = ['호텔', '공항', '경찰서', '택시', '버스', '기타'];

async function sendRequest(loc) {
  const payload = {
    type: 'proxy_pickup',
    caseId: `test-case-${Date.now()}`,
    itemName: `${loc}에서 분실한 가방`,
    requesterName: '테스트유저',
    contact: 'wechat_test',
    mgmtNumber: 'MGMT-001',
    method: 'delivery',
    address: '제주특별자치도 제주시 테스트동 123',
    originalWechat: 'original_wechat',
    region: '제주시',
    place: '테스트 장소',
    userAgent: 'Node.js Script',
    proxyLocationType: loc,
    hotelName: loc === '호텔' ? '제주 테스트 호텔' : '',
    hotelBooker: loc === '호텔' ? '홍길동' : '',
    roomNum: loc === '호텔' ? '101호' : '',
    vehicleInfo: (loc === '택시' || loc === '버스') ? '제주 12가 3456' : '',
    boardTime: (loc === '택시' || loc === '버스') ? '2023-10-01T12:00' : '',
    locDetail: loc === '기타' ? '어떤 건물 앞' : '상세 위치 테스트',
    phone: '010-1234-5678',
    // Mock empty base64 images to prevent large payloads, or minimal data
    passportPhoto: '',
    itemPhoto: '',
    reservationPhoto: ''
  };

  try {
    console.log(`Sending for ${loc}...`);
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log(`Result for ${loc}:`, data);
  } catch (err) {
    console.error(`Error for ${loc}:`, err);
  }
}

async function run() {
  for (const loc of locations) {
    await sendRequest(loc);
    // Add small delay to avoid rate limit or concurrent lock issues on GAS
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  console.log('Done testing all locations.');
}

run();
