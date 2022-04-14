import './pre-start'; // Must be the first import
import app from '@server';
import https from 'https';
import { readFileSync } from 'fs';
import sockets, { socketAuth } from './routes/Sockets';
import options from './pre-start/index'
import { Server, Socket } from 'socket.io';
import { socketCORS } from '@shared/constants';

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

if (options.env !== 'development') httpsOptions.ca = readFileSync(process.env.SSL_CA!, 'utf8');

const server = https.createServer(httpsOptions , app);

export const io = new Server(server, { cors: socketCORS });
             io.use(socketAuth);
             io.on('connection', (socket: Socket) => {
               sockets(socket);
             });

server.listen(process.env.HTTPS_PORT, () => { console.log('HTTPS LARS NODE listening on port', process.env.HTTPS_PORT) })
app.listen(process.env.HTTP_PORT, () => { console.log('HTTP LARS NODE listening on port', process.env.HTTP_PORT)})
