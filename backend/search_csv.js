const fs = require('fs');

const CSV_PATH = "C:\\Users\\hassa\\Documents\\Fee Challan with data file  August ,2026.0.csv";

if (fs.existsSync(CSV_PATH)) {
    const content = fs.readFileSync(CSV_PATH, 'utf8');
    const lines = content.split('\n');
    const searchTerms = ['5001', '5002', '5006', '5012', '5019', '5007', '3001', '3002', '3003', '3004', '3005', '3006'];
    let out = "Search results:\n";
    lines.forEach((line, idx) => {
        searchTerms.forEach(term => {
            if (line.includes(term)) {
                out += `Line ${idx + 1} matches ${term}: ${line}\n`;
            }
        });
    });
    fs.writeFileSync('search_output.txt', out);
} else {
    fs.writeFileSync('search_output.txt', "CSV File does not exist");
}
