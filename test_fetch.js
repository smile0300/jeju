async function test() {
  try {
    const url = 'https://api.visitjeju.net/vsjApi/contents/searchList?locale=kr&category=c5&apiKey=fd0365a6919e44c3b120034ba100678f&pageSize=5';
    const res = await fetch(url);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e.message);
  }
}
test();
