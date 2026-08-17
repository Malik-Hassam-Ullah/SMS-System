require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');
const fs = require('fs');

supabaseAdmin
    .from('students')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .single()
    .then(({ data, error }) => {
        if (error) { fs.writeFileSync('cols_out.txt', 'ERROR: ' + error.message); return; }
        let out = '=== ALL COLUMNS ===\n';
        Object.keys(data).forEach(k => {
            out += `${k} = ${JSON.stringify(data[k])}\n`;
        });
        fs.writeFileSync('cols_out.txt', out);
        console.log('Written to cols_out.txt');
    });
