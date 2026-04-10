const str = '&#44053;&#54413;&#51452;&#51032;&#48372; &#51204;&#47732;&#53685;&#51228;';
const decoded = str.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
console.log(decoded);
