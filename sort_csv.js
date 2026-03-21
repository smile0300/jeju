const fs = require('fs');

function sortCsv() {
    const filePath = 'festival_data_review.csv';
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        // Remove BOM if present
        const cleanContent = content.startsWith('\uFEFF') ? content.slice(1) : content;
        const lines = cleanContent.split('\n').filter(line => line.trim() !== '');
        
        const header = lines[0];
        const dataLines = lines.slice(1);
        
        // contentsid는 두 번째 컬럼 (index 1)
        // 줄을 쉼표로 나눌 때 따옴표 안에 쉼표가 있을 수 있으므로 정규식 등이 필요할 수 있으나, 
        // 간단히 split으로 처리 (우리가 직접 만든 파일이므로 구조가 일정함)
        
        dataLines.sort((a, b) => {
            const getId = (line) => {
                const parts = line.split('","');
                if (parts.length > 1) {
                    // "CNTS_... 형태에서 숫자 부분 추출
                    const fullId = parts[1].replace(/"/g, '');
                    const match = fullId.match(/\d+/);
                    return match ? BigInt(match[0]) : 0n;
                }
                return 0n;
            };
            
            const idA = getId(a);
            const idB = getId(b);
            
            if (idA < idB) return -1;
            if (idA > idB) return 1;
            return 0;
        });
        
        const sortedContent = "\uFEFF" + [header, ...dataLines].join('\n');
        fs.writeFileSync(filePath, sortedContent, 'utf8');
        console.log(`Successfully sorted ${dataLines.length} items by contentsid.`);
    } catch (e) {
        console.error(`Error sorting CSV: ${e.message}`);
    }
}

sortCsv();
