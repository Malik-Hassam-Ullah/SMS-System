const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.jsx') || file.endsWith('.js')) {
                results.push(file);
            }
        }
    });
    return results;
}

let out = '';
const files = walk('c:\\Users\\hassa\\Downloads\\SMS-System-main\\frontend\\src');
files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
        const lower = line.toLowerCase();
        const cleanedLine = lower.replace(/undefined/g, '');
        if (cleanedLine.includes('fine') || cleanedLine.includes('late_fee') || cleanedLine.includes('latefee')) {
            out += `${file}:${idx + 1}: ${line.trim()}\n`;
        }
    });
});

fs.writeFileSync('find_fine_out.txt', out);
console.log('Done');
