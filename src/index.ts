import './pre-start'; // Must be the first import
import app from '@server';
import https from 'https';
import { readFileSync } from 'fs';
import WebSocket from 'ws';
import sockets from './routes/WS';

// Start the server

const server = https.createServer({
  key: readFileSync(process.env.SSL_KEY!, 'utf8'),
  cert: readFileSync(process.env.SSL_CERT!, 'utf8'),
  // ca: readFileSync(process.env.SSL_CA!, 'utf8'),
  rejectUnauthorized: false
}, app);
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws: WebSocket, req: any) => {
  sockets(ws, req)
});
server.listen(process.env.HTTPS_PORT, () => { console.log('HTTPS LARS NODE listening on port', process.env.HTTPS_PORT) })
