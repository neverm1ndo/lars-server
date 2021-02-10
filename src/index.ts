import './pre-start'; // Must be the first import
import app from '@server';
import https from 'https';

// Start the server
const port = Number(process.env.HTTP_PORT || 3000);
https.createServer({
  key: process.env.SSL_KEY!,
  cert: process.env.SSL_CERT!
}, app).listen(port, () => { console.log(' DEV HTTP LLS listening on port', port) });
