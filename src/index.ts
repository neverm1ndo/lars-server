import './pre-start'; // Must be the first import
import app from '@server';
import https from 'https';
import { readFileSync } from 'fs';
import expressWS from 'express-ws';

// Start the server
expressWS(app,
https.createServer({
  key: readFileSync(process.env.SSL_KEY!, 'utf8'),
  cert: readFileSync(process.env.SSL_CERT!, 'utf8'),
  ca: readFileSync(process.env.SSL_CA!, 'utf8'),
  rejectUnauthorized: false
}).listen(process.env.HTTPS_PORT, () => { console.log('HTTPS LLS NODE listening on port', process.env.HTTPS_PORT) }),
{ leaveRouterUntouched: false,
  wsOptions: {
      clientTracking: true
  }
});

app.listen(process.env.HTTP_PORT, () => { console.log('HTTP LLS NODE listening on port', process.env.HTTP_PORT) });
