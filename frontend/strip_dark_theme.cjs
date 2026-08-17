const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(file));
        } else if (file.endsWith('.jsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walkDir(directoryPath);

let modifiedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;

    // Remove text colors
    content = content.replace(/\btext-white\b/g, '');
    content = content.replace(/\btext-gray-300\b/g, 'text-slate-600');
    content = content.replace(/\btext-gray-400\b/g, 'text-slate-500');
    content = content.replace(/\btext-gray-500\b/g, 'text-slate-400');

    // Remove backgrounds
    content = content.replace(/\bbg-gray-950\/[0-9]+\b/g, 'bg-white/80');
    content = content.replace(/\bbg-gray-900\/[0-9]+\b/g, 'bg-white/50');
    content = content.replace(/\bbg-gray-800\/[0-9]+\b/g, 'bg-slate-50/50');
    content = content.replace(/\bbg-gray-700\/[0-9]+\b/g, 'bg-slate-100');
    content = content.replace(/\bbg-gray-900\b/g, 'bg-white');
    content = content.replace(/\bbg-gray-800\b/g, 'bg-white');
    content = content.replace(/\bbg-gray-700\b/g, 'bg-slate-50');

    // Remove borders
    content = content.replace(/\bborder-gray-800\b/g, 'border-slate-200');
    content = content.replace(/\bborder-gray-700(\/50)?\b/g, 'border-slate-200');
    content = content.replace(/\bborder-gray-600\b/g, 'border-slate-200');

    // Remove hovers
    content = content.replace(/\bhover:bg-gray-800\b/g, 'hover:bg-slate-100');
    content = content.replace(/\bhover:bg-gray-700\b/g, 'hover:bg-slate-50');
    content = content.replace(/\bhover:bg-gray-600\b/g, 'hover:bg-slate-100');
    
    // Fix any double spaces left behind
    content = content.replace(/ {2,}/g, ' ');
    // Fix spaces before quotes in className (e.g. className=" something")
    content = content.replace(/className="\s+/g, 'className="');
    // Fix spaces before backticks in className (e.g. className={` something`})
    content = content.replace(/className=\{`\s+/g, 'className={`');
    
    // Fix any empty classNames that might have been created
    content = content.replace(/className=""/g, '');

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        modifiedCount++;
    }
});

console.log(`Processed ${files.length} files. Modified ${modifiedCount} files.`);
