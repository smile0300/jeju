async function test() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yyyymmdd = d.toISOString().split('T')[0].replace(/-/g, '');
  const polEndpoint = `http://apis.data.go.kr/1320000/LosfundInfoInqireService/getLosfundInfoAccToClAreaPd`;
  const url = `http://localhost:3000/api/public-data?endpoint=${encodeURIComponent(polEndpoint)}&numOfRows=10&pageNo=1&N_FD_LCT_CD=LCA000&START_YMD=${yyyymmdd}&END_YMD=${yyyymmdd}`;
  const res = await fetch(url);
  const text = await res.text();
  console.log('HTTP:', res.status, res.statusText);
  console.log(text.substring(0, 500));
}
test();
