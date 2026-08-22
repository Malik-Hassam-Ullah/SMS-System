require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 5000;
const { connectToWhatsApp } = require('./src/utils/whatsapp.util');

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ SMS Backend running on port ${PORT} (0.0.0.0)`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);

  // Initialize WhatsApp connection
  connectToWhatsApp();
});