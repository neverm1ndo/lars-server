import './pre-start'; // Must be the first import
import app, { sessionMiddleware } from '@server';
import https from 'https';
import { readFileSync } from 'fs';
import sockets, { wrap } from './routes/Sockets';
import { Server } from 'socket.io';
import { socketCORS, logger } from '@shared/constants';
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

logger.log(
  'START LARS SERVER\n',
  `⠀⠀⠀⠀⠀⠀⠀⠀⣀⣤⣤⣤⣤⣤⣀⠀⠀⠀⠀⠀⠀⠀⠀
  ⠀⠀⠀⠀⢀⣤⣾⣿⣿⣿⣿⣿⣿⡿⢿⣿⣷⣄⡀⠀⠀⠀⠀
  ⠀⠀⠀⣴⣿⣿⣿⣿⣿⣿⣿⠟⠁⠀⢸⣿⣿⣿⣿⣦⠀⠀⠀gta-liberty.ru
  ⠀⠀⣾⣿⣿⣿⣿⣿⣿⠟⠁⠀⠀⠀⠀⢻⣿⣿⣿⣿⣧⠀⠀
  ⠀⣸⣿⣿⣿⡿⠉⣿⠃⠀⠀⠀⠀⠀⠀⠀⠻⣿⣿⣿⣿⣇  ██       █████  ██████  ███████ 
  ⠀⣿⣿⣿⣿⠁⠀⠻⠀⠀⠀⠀⠀⠀⠀⠀⠀⢹⣿⣿⣿⣿⡇ ██      ██   ██ ██   ██ ██ 
  ⠀⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⣾⣧⠀⠀⠀⠀⢸⣿⣿⣿⣿⡇ ██      ███████ ██████  ███████
  ⠀⢹⣿⣿⣿⡆⠀⠀⢠⣦⣼⣿⣿⣇⠀⠀⠀⣼⣿⣿⣿⡇  ██      ██   ██ ██   ██      ██
  ⠀⠀⢿⣿⣿⣿⣄⠀⠈⢿⣿⣿⣿⠇⠀⢠⣾⣿⣿⣿⡟⠀⠀ ███████ ██   ██ ██   ██ ███████
  ⠀⠀⠀⠻⣿⣿⣿⠀⠀⠀⠈⠉⠁⠀⠀⢸⣿⣿⣿⠏⠀⠀⠀ 
  ⠀⠀⠀⠀⠈⠛⢿⣧⣄⠀⠀⠀⠀⢀⣤⣿⡿⠋⠁⠀⠀⠀⠀ version v${process.env.npm_package_version}
  ⠀⠀⠀⠀⠀⠀⠀⠀⠉⠀⠀⠀⠀⠈⠉⠀⠀⠀⠀⠀⠀⠀⠀ pid     ${process.pid}`,
  '\n'
);
server.listen(process.env.HTTPS_PORT, () => { logger.log('[LARS_NODE]', 'HTTPS PORT:', process.env.HTTPS_PORT) });
app.listen(process.env.HTTP_PORT, () => { logger.log('[LARS_NODE]', 'HTTP  PORT:', process.env.HTTP_PORT)});
