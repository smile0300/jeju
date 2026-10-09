// Phosphor Icons 2.1.2 — jeju-live.com 자체 호스팅 (중국 접속 안정성)
// 원본 로더와 동일하게 굵기별 스타일시트를 head에 추가한다. 사이트가 쓰지 않는 thin/light는 제외.
var head = document.getElementsByTagName("head")[0];
for (const weight of ["regular", "bold", "fill", "duotone"]) {
  var link = document.createElement("link");
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = `/vendor/phosphor-2.1.2/${weight}/style.css`;
  head.appendChild(link);
}
