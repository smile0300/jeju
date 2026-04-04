const html = `
<a href="/hallasan/info/info/realtime/course01.htm">
  <dl class="main-visit-list">
    <dt>어리목탐방로</dt>
    <dd class="visit-time">편도 6.8km / 3시간</dd>
    <dd class="situation mountaintop">강풍주의보로 윗세오름까지</dd>
    <dd class="visit-road">
      <span class="road-label read-code">어리목주차장</span><br />
      <span class="road-label read-code">윗세오름대피소</span>
    </dd>
  </dl>
</a>
<a href="/hallasan/info/info/realtime/course02.htm"><dl class="main-visit-list"><dt>영실탐방로</dt><dd class="situation">정상운영</dd></dl></a>
`;

const blockPattern = /<dl[^>]*>[\s\S]*?<\/dl>/g;
const namePattern = /<dt[^>]*>([\s\S]*?)<\/dt>/;
// Modified regex
const statusPattern = /<dd[^>]*class="[^"]*situation[^"]*"[^>]*>([\s\S]*?)<\/dd>/;

const stripTags = (str) => (str || '').replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, '').trim();

const results = [];
let match;
while ((match = blockPattern.exec(html)) !== null) {
  const block = match[0];
  const nameMatch = namePattern.exec(block);
  const statusMatch = statusPattern.exec(block);
  
  if (nameMatch && statusMatch) {
    results.push({
      name: stripTags(nameMatch[1]),
      status: stripTags(statusMatch[1])
    });
  }
}

console.log(JSON.stringify(results, null, 2));
