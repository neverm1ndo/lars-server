import './pre-start'; // Must be the first import
import app from '@server';
import https from 'https';

// Start the server
https.createServer({
  key: process.env.SSL_KEY!,
  cert: process.env.SSL_CERT!
}, app).listen(process.env.HTTPS_PORT, () => { console.log(' DEV HTTP LLS listening on port', process.env.HTTPS_PORT) });

 app.listen(process.env.HTTP_PORT, () => { console.log(' DEV HTTP LLS listening on port', process.env.HTTP_PORT) });
