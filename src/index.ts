import './pre-start'; // Must be the first import
import app, { sessionMiddleware } from '@server';
import https from 'https';
import { readFileSync } from 'fs';
import sockets, { wrap } from './routes/Sockets';
import { Server } from 'socket.io';
import { socketCORS } from '@shared/constants';
import passport from 'passport';
import { IHttpsOptions, ISocket } from '@interfaces/httpio.enum';

// Start the server

const httpsOptions: IHttpsOptions = {
  key: readFileSync(process.env.SSL_KEY!, 'utf8'),
  cert: readFileSync(process.env.SSL_CERT!, 'utf8'),
  rejectUnauthorized: false
};

const server: https.Server = https.createServer(httpsOptions , app);

export const io: Server = new Server(server, { cors: socketCORS, path: '/notifier/' });
             
             io.use(wrap(sessionMiddleware));
             io.use(wrap(passport.authenticate('jwt')));
             io.use(wrap(passport.initialize()));
             io.use(wrap(passport.session()));
             
             io.use((socket: any, next) => {
              socket.request.user ? next() 
                                  : next(new Error('Unauthorized'));
             });
             io.on('connection', (socket: ISocket) => {
               sockets(socket);
             });

server.listen(process.env.HTTPS_PORT, () => { console.log('HTTPS LARS NODE listening on port', process.env.HTTPS_PORT) });
app.listen(process.env.HTTP_PORT, () => { console.log('HTTP LARS NODE listening on port', process.env.HTTP_PORT)})
