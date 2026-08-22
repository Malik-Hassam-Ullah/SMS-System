const http = require('http');

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL('http://localhost:5000/api' + path);
    const opts = {
      hostname: url.hostname, port: 5000,
      path: url.pathname + url.search, method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }
    };
    const r = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ s: res.statusCode, b: JSON.parse(d) }); } catch { resolve({ s: res.statusCode, b: d }); } });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function testOne() {
  console.log('Testing login...');
  const br = await req('GET', '/auth/branches');
  const mainBranch = (br.b?.data || []).find(b => b.name === 'Main Campus') || br.b?.data?.[0];
  const login = await req('POST', '/auth/login', {
    email: 'admin@gmail.com', password: 'Admin@1234', role: 'admin', branchId: mainBranch.id
  });
  const tok = login.b.data.access_token;
  console.log('Admin logged in.');

  const clsRes = await req('GET', '/classes', null, tok);
  const classes = clsRes.b.data;
  console.log('Got classes:', classes.length);

  const exmRes = await req('GET', '/exams', null, tok);
  const exams = exmRes.b.data;
  console.log('Got exams:', exams.length);

  console.log('Fetching report for class 0, exam 0:');
  console.log('class:', classes[0].name, classes[0].id);
  console.log('exam:', exams[0].name, exams[0].id);

  const rpt = await req('GET', `/marks/report/class/${classes[0].id}/exam/${exams[0].id}`, null, tok);
  console.log('Report result status:', rpt.s);
  console.log('Report body summary:', {
    total_students: rpt.b?.data?.total_students,
    subjects: rpt.b?.data?.subjects,
    rows: rpt.b?.data?.rows?.length,
    top5: rpt.b?.data?.top5
  });
}

testOne().catch(console.error);
