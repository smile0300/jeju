const fs = require('fs');
const path = require('path');

/**
 * SVG 패스 데이터를 최적화하는 함수 (좌표 반올림)
 */
function optimizePathData(pathData) {
    // 숫자(정수 또는 소수)를 찾아서 소수점 첫째 자리까지 반올림
    return pathData.replace(/[-+]?\d*\.\d+|\d+/g, (match) => {
        const val = parseFloat(match);
        if (Number.isInteger(val)) return val.toString();
        // 소수점 첫째 자리까지 반올림 후 불필요한 0 및 소수점 제거
        return parseFloat(val.toFixed(1)).toString();
    });
}

function main() {
    const filePath = 'c:\\jeju-live\\src\\parts\\cctv.html';
    
    if (!fs.existsSync(filePath)) {
        console.error(`Error: ${filePath} not found.`);
        process.exit(1);
    }

    let content = fs.readFileSync(filePath, 'utf-8');
    const originalSize = Buffer.byteLength(content, 'utf8');
    console.log(`Original size: ${(originalSize / 1024).toFixed(2)} KB`);

    // 1. 버그 수정: region-jeju의 마지막 배경 패스 제거
    // M371,1008.8 L1157.8,222.1 ... 
    const buggyPathRegex = /<path d="M371,1008\.8 L1157\.8,222\.1[^"]+" \/>/g;
    content = content.replace(buggyPathRegex, '');

    // 2. 언어 번역: "CCTV 명칭" -> "监控名称"
    content = content.replace('<h3 id="cctv-target-name">CCTV 명칭</h3>', '<h3 id="cctv-target-name">监控名称</h3>');

    // 3. 성능 최적화: SVG 좌표 반올림 루틴
    // d="...데이터..." 형태를 찾아서 내부 수치 가공
    content = content.replace(/d="([^"]+)"/g, (match, pathData) => {
        const optimized = optimizePathData(pathData);
        return `d="${optimized}"`;
    });

    // 4. 불필요한 공백 제거 (압축) - 선택 사항이지만 용량 절감을 위해 적용
    // 태그 사이의 줄바꿈과 공백을 최소화 (단, 텍스트 노드 주의)
    // 여기서는 패스 데이터 사이의 줄바꿈 정도만 제거
    content = content.replace(/>\s+</g, '><');

    fs.writeFileSync(filePath, content, 'utf-8');

    const optimizedSize = Buffer.byteLength(content, 'utf8');
    console.log(`Optimized size: ${(optimizedSize / 1024).toFixed(2)} KB`);
    console.log(`Reduction: ${((1 - optimizedSize / originalSize) * 100).toFixed(1)}%`);
    console.log('Optimization complete.');
}

main();
