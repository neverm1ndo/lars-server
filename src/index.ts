import './pre-start'; // Must be the first import
import app from '@server';
import https from 'https';
import { readFileSync } from 'fs';
import WebSocket from 'ws';
import sockets from './routes/WS';
import options from './pre-start/index'

// Start the server

interface HttpsOptions {
  key: string,
  cert: string,
  ca?: string,
  rejectUnauthorized: boolean
}

const httpsOptions: HttpsOptions = {
  key: readFileSync(process.env.SSL_KEY!, 'utf8'),
  cert: readFileSync(process.env.SSL_CERT!, 'utf8'),
  rejectUnauthorized: false
};

if (options.env !== 'development') {
  httpsOptions.ca = readFileSync(process.env.SSL_CA!, 'utf8');
}

const server = https.createServer(httpsOptions , app);
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws: WebSocket, req: any) => {
  sockets(ws, req)
});
server.listen(process.env.HTTPS_PORT, () => { console.log('HTTPS LARS NODE listening on port', process.env.HTTPS_PORT) })
app.listen(process.env.HTTP_PORT, () => { console.log('HTTP LARS NODE listening on port', process.env.HTTP_PORT)})
