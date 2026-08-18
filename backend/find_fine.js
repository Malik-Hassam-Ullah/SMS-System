const fs = require('fs');
const lines = fs.readFileSync('c:\\Users\\hassa\\Downloads\\SMS-System-main\\backend\\src\\routes\\fee.routes.js', 'utf8').split('\n');
lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('fine')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
