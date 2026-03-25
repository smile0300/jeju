async function test() {
  try {
    const contentsid = 'CONT_000000000500282';
    const url = `https://api.visitjeju.net/vsjApi/contents/detail?contentsid=${contentsid}&locale=kr&apiKey=fd0365a6919e44c3b120034ba100678f`;
    const res = await fetch(url);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e.message);
  }
}
test();
