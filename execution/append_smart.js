const fs = require('fs');

const jsCode = `
/* ==================== Lost Report Feature ==================== */
let lostReportImageBase64 = null;

function openLostReportModal() {
    document.getElementById('lost-report-modal').style.display = 'flex';
    document.getElementById('lost-report-location').value = '';
    
    const now = new Date();
    const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const yyyy = kstTime.getUTCFullYear();
    const mm = String(kstTime.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(kstTime.getUTCDate()).padStart(2, '0');
    
    document.getElementById('lost-report-date').value = \`\${yyyy}-\${mm}-\${dd}\`;
    document.getElementById('lost-report-time').value = '';
    document.getElementById('lost-report-item').value = '';
    document.getElementById('lost-report-specifics').value = '';
    document.getElementById('lost-report-photo').value = '';
    document.getElementById('lost-report-wechat').value = '';
    
    const preview = document.getElementById('lost-report-photo-preview');
    preview.style.display = 'none';
    preview.innerHTML = '';
    lostReportImageBase64 = null;
    
    const statusDiv = document.getElementById('lost-report-status');
    statusDiv.style.display = 'none';
    statusDiv.className = 'form-status';
    
    document.getElementById('lost-report-submit-btn').disabled = false;
    document.getElementById('lost-report-submit-btn').innerText = '提交报失登记';
    
    document.body.style.overflow = 'hidden';
}

function closeLostReportModal() {
    document.getElementById('lost-report-modal').style.display = 'none';
    document.body.style.overflow = '';
}

function handleLostImageChange(event) {
    const file = event.target.files[0];
    if (!file) {
        lostReportImageBase64 = null;
        document.getElementById('lost-report-photo-preview').style.display = 'none';
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        alert('照片大小不能超过2MB。请选择较小的文件。');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        lostReportImageBase64 = e.target.result;
        const preview = document.getElementById('lost-report-photo-preview');
        preview.innerHTML = \`<img src="\${lostReportImageBase64}" alt="Preview">\`;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

async function submitLostReport() {
    const location = document.getElementById('lost-report-location').value.trim();
    const date = document.getElementById('lost-report-date').value;
    const time = document.getElementById('lost-report-time').value;
    const itemName = document.getElementById('lost-report-item').value.trim();
    const specifics = document.getElementById('lost-report-specifics').value.trim();
    const wechatId = document.getElementById('lost-report-wechat').value.trim();
    
    const statusDiv = document.getElementById('lost-report-status');
    const submitBtn = document.getElementById('lost-report-submit-btn');

    if (!location || !date || !itemName || !wechatId) {
        statusDiv.className = 'form-status error';
        statusDiv.innerText = '⚠️ 请填写所有必填项 (地点, 日期, 物品名称, 微信ID)';
        statusDiv.style.display = 'block';
        return;
    }

    const reportData = {
        type: 'lost_report',
        location: location,
        date: date,
        time: time,
        itemName: itemName,
        specifics: specifics,
        photo: lostReportImageBase64 || '',
        wechatId: wechatId,
        userAgent: navigator.userAgent
    };

    try {
        submitBtn.disabled = true;
        submitBtn.innerText = '正在提交... ⏳';
        statusDiv.style.display = 'none';

        const response = await fetch('/api/lost-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportData)
        });

        if (!response.ok) {
            throw new Error('Server returned ' + response.status);
        }

        const result = await response.json();

        if (result.result === 'success' || result.status === 'success') {
            statusDiv.className = 'form-status success';
            statusDiv.innerText = '✅ 提交成功！如果您找到物品，我们将通过微信联系您。';
            statusDiv.style.display = 'block';
            
            setTimeout(() => {
                closeLostReportModal();
            }, 3000);
        } else {
            throw new Error(result.error || 'Unknown error');
        }

    } catch (error) {
        console.error('Lost Report Submit Error:', error);
        statusDiv.className = 'form-status error';
        statusDiv.innerText = '❌ 提交失败，请稍后再试或直接联系我们。';
        statusDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.innerText = '重新提交登记';
    }
}
`;

const cssCode = `
/* ==================== Lost Report Feature ==================== */
.lost-report-btn {
    width: 100%;
    padding: 14px;
    border-radius: 12px;
    background: var(--primary-gradient);
    color: white;
    border: none;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 4px 15px rgba(67, 56, 202, 0.2);
}

.lost-report-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(67, 56, 202, 0.4);
}

.lost-report-form-content {
    max-width: 500px;
    width: 90%;
    padding: 0;
    overflow: hidden;
}

.lost-report-header {
    background: var(--bg-card-hover);
    padding: 20px 25px;
    border-bottom: 1px solid var(--border-light);
}

.lost-report-header h3 {
    margin-bottom: 5px;
    color: var(--text-primary);
}

.lost-report-header p {
    font-size: 0.85rem;
    color: var(--text-muted);
}

.lost-report-body {
    padding: 25px;
    max-height: 70vh;
    overflow-y: auto;
}

.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 6px;
    color: var(--text-secondary);
}

.form-group input, 
.form-group textarea {
    width: 100%;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid var(--border-light);
    font-family: inherit;
    font-size: 0.95rem;
    transition: border-color 0.2s;
}

.form-group input:focus, 
.form-group textarea:focus {
    outline: none;
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-group textarea {
    min-height: 80px;
    resize: vertical;
}

.form-row {
    display: flex;
    gap: 15px;
}

.form-row .form-group {
    flex: 1;
}

.photo-preview {
    margin-top: 10px;
    max-width: 100%;
    border-radius: 8px;
    overflow: hidden;
    display: none;
}

.photo-preview img {
    width: 100%;
    height: auto;
    display: block;
}

.form-submit-btn {
    width: 100%;
    padding: 14px;
    border-radius: 12px;
    background: var(--primary-gradient);
    color: white;
    border: none;
    font-size: 1.05rem;
    font-weight: 700;
    cursor: pointer;
    margin-top: 10px;
    transition: all 0.2s;
}

.form-submit-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(67, 56, 202, 0.3);
}

.form-submit-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
}

.form-status {
    margin-top: 15px;
    margin-bottom: 15px;
    font-size: 0.9rem;
    text-align: center;
    border-radius: 8px;
    padding: 10px;
    display: none;
}
.form-status.success {
    background: #ecfdf5;
    color: #065f46;
    display: block;
}
.form-status.error {
    background: #fef2f2;
    color: #991b1b;
    display: block;
}

@media (max-width: 480px) {
    .form-row {
        flex-direction: column;
        gap: 0;
    }
}
`;

function appendSmart(filePath, content) {
    const buf = fs.readFileSync(filePath);
    const isUtf16Le = buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe;
    
    if (isUtf16Le) {
        console.log(\`\${filePath} is UTF-16LE\`);
        const appendBuf = Buffer.from('\\r\\n' + content, 'utf16le');
        fs.appendFileSync(filePath, appendBuf);
    } else {
        console.log(\`\${filePath} is UTF-8 (or other)\`);
        fs.appendFileSync(filePath, '\\n' + content, 'utf8');
    }
}

appendSmart('script.js', jsCode);
appendSmart('style.css', cssCode);

console.log("Successfully appended JS and CSS preserving encodings.");
