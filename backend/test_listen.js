const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('OK'));
const server = app.listen(5000, () => {
  console.log('Listening on 5000...');
  setTimeout(() => {
    console.log('Closing server...');
    server.close();
  }, 3000);
});
