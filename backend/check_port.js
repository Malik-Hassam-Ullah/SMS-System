const net = require('net');
const server = net.createServer();

server.once('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('Port 5000 is IN USE!');
  } else {
    console.log('Error:', err);
  }
  process.exit(0);
});

server.once('listening', () => {
  console.log('Port 5000 is FREE!');
  server.close();
  process.exit(0);
});

server.listen(5000);
