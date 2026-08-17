require('dotenv').config();
const app = require('./src/app');
console.log('App type:', typeof app);
console.log('App listen type:', typeof app.listen);
console.log('Starting server...');
const server = app.listen(5001, () => {
  console.log('Server started on 5001!');
  console.log('Active connections count:', server.listening);
  setTimeout(() => {
    console.log('Active handles:', process._getActiveHandles().length);
    console.log('Active requests:', process._getActiveRequests().length);
  }, 1000);
});
