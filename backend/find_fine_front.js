const fs = require('fs');
const lines = fs.readFileSync('c:\\Users\\hassa\\Downloads\\SMS-System-main\\frontend\\src\\pages\\admin\\fees\\GenerateVoucherPage.jsx', 'utf8').split('\n');
lines.forEach((line, idx) => {
    const cleaned = line.toLowerCase().replace(/undefined/g, '');
    if (cleaned.includes('fine')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
