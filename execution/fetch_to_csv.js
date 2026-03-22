const fs = require('fs');

async function fetchAndSaveCsv() {
    const apiKey = "fd0365a6919e44c3b120034ba100678f";
    const url = `https://api.visitjeju.net/vsjApi/contents/searchList?locale=kr&category=c5&apiKey=${apiKey}&pageSize=500`;
    
    try {
        console.log(`Fetching data from ${url}...`);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        const items = data.items || [];
        
        const columns = ['title', 'contentsid', 'address', 'imgpath', 'tags', 'introduction'];
        const csvRows = [];
        
        // Header
        csvRows.push(columns.join(','));
        
        for (const item of items) {
            const imgpath = item.repPhoto?.photoid?.imgpath || '';
            const row = [
                `"${(item.title || '').replace(/"/g, '""')}"`,
                `"${(item.contentsid || '')}"`,
                `"${(item.address || '').replace(/"/g, '""')}"`,
                `"${imgpath}"`,
                `"${(item.alltag || '').replace(/"/g, '""')}"`,
                `"${(item.introduction || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
            ];
            csvRows.push(row.join(','));
        }
        
        const csvContent = "\uFEFF" + csvRows.join('\n'); // Add BOM for Excel
        fs.writeFileSync('festival_data_review.csv', csvContent, 'utf8');
        
        console.log(`Successfully saved ${items.length} items to festival_data_review.csv`);
    } catch (e) {
        console.error(`Error: ${e.message}`);
    }
}

fetchAndSaveCsv();
