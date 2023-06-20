import Workgroup from '@enums/workgroup.enum';
import { Socket } from 'socket.io';
import { io } from '../index';
import { omp, statsman, logger } from '@shared/constants';
import { getAvatarURL } from '@shared/functions';
import { ISocket } from '@interfaces/httpio.enum';


const { DEV } = Workgroup;

const LOGGER_PREFIX = '[SOCKET]';

enum ServerStatus {
  OFFLINE = 1,
  REBOOTING,
  LIVE,
  LAUNCHING,
}

export enum UserActivity {
  IDLE,
  IN_LOGS,
  IN_MAPS,
  REDACT,
  IN_BANS,
  IN_ADM,
  IN_BACKS,
  IN_STATS
}

const isDev = (socket: ISocket): boolean => {
  if (socket.request.user?.main_group !== DEV) return false; 
  return true;
}

export const wrap = (middleware: any) => (socket: Socket, next: any) => middleware(socket.request, {}, next);

const sockets = (socket: ISocket) => {
  isDev(socket) ? socket.join('devs')
                : socket.join('main');

  if (socket.handshake.auth.app === 'modloader') socket.join('server_log');
  
  logger.log(LOGGER_PREFIX, 'USER_CONNECT', `(${socket.handshake.address})`, socket.request.user?.username, Workgroup[socket.request.user?.main_group as number]);
  
  socket.on('get-status', async () => {
    if (!isDev(socket)) return; 
    
    try {
      const status: boolean = await omp.getServerStatus();

      logger.log(LOGGER_PREFIX, 'SERVER_GET_STATUS', `(${socket.handshake.address})`, socket.request.user?.username, status);
      socket.emit('server-status', status ? ServerStatus.LIVE : ServerStatus.OFFLINE);
    } catch (error: any) {
      logger.err(LOGGER_PREFIX, 'SERVER_STATUS', error.message);
      socket.emit('server-error', error);
    }
  });

  socket.on('reboot-server', async () => {
    if (!isDev(socket)) return;
    
    logger.log(LOGGER_PREFIX, 'SERVER_REBOOT', `(${socket.handshake.address})`, socket.request.user?.username);
    
    io.sockets.emit('server-status', ServerStatus.REBOOTING);
    io.sockets.emit('alert:server-rebooting', { 
      username: socket.request.user?.username, 
      user_avatar: getAvatarURL(socket.request.user?.user_avatar!),
      group_id: socket.request.user?.main_group,
    });
    
    try {
      await omp.reboot();
      
      socket.broadcast.to('devs').emit('server-rebooted');
      io.sockets.emit('server-status', ServerStatus.LIVE);
      
      statsman.snapshot = 0;
      statsman.tail();
      
      logger.log(LOGGER_PREFIX, 'SERVER_REBOOT_SUCCESS', `(${socket.handshake.address})`, socket.request.user?.username);
    } catch(error: any) {
      logger.err(LOGGER_PREFIX, 'SERVER_REBOOT', `(${socket.handshake.address})`, socket.request.user?.username);
      socket.broadcast.to('devs').emit('server-error', error);
    };
  });

  socket.on('stop-server', async () => {
    if (!isDev(socket)) return;
    
    logger.log(LOGGER_PREFIX, 'SERVER_STOP', `(${socket.handshake.address})`, socket.request.user?.username);
    
    try {
      const stdout = await omp.stop()
      
      io.sockets.emit('server-stoped', stdout);
      io.sockets.emit('server-status', ServerStatus.OFFLINE);
      socket.broadcast.emit('alert:server-stoped', { 
        username: socket.data.username, 
        group_id: socket.data.main_group 
      });
      
      statsman.snapshot = 0;
      statsman.tail();
      
      logger.log(LOGGER_PREFIX, 'SERVER_STOP_SUCCESS', `(${socket.handshake.address})`, socket.request.user?.username);
    } catch (error: any) {
      logger.err(LOGGER_PREFIX, 'SERVER_STOP_FAIL', `(${socket.handshake.address})`, socket.request.user?.username);
      socket.broadcast.to('devs').emit('server-error', error);
    };
  });

  socket.on('launch-server', () => {
    if (!isDev(socket)) return;
    
    logger.log(LOGGER_PREFIX, 'SERVER_LAUNCH', `(${socket.handshake.address})`, socket.request.user?.username);

    io.emit('server-status', ServerStatus.LAUNCHING);
    
    omp.launch()
       .then(() => {
         io.sockets.emit('server-launched');
         logger.log(LOGGER_PREFIX, 'SERVER_LAUNCH_SUCCESS', `(${socket.handshake.address})`, socket.request.user?.username);
       })
       .catch((error) => {
        logger.err(LOGGER_PREFIX, 'SERVER_STOP_FAIL', `(${socket.handshake.address})`, socket.request.user?.username);
         socket.broadcast.to('devs').emit('server-error', error);
       });
  });

  socket.on('user-action', (action) => {
    logger.log(LOGGER_PREFIX, 'USER_ACTION', `(${socket.handshake.address})`, socket.request.user?.username, UserActivity[action]);
    
    socket.data.activity = action;
    io.sockets.emit('user-activity', { 
      user: socket.request.user?.username, 
      action
    });
  });

  socket.on('update', () => {
    socket.emit('update:soft');
  });

  socket.on('disconnect', (reason) => {
    logger.log(LOGGER_PREFIX, 'USER_DISCONNECT', `(${socket.handshake.address})`, socket.request.user?.username);
    socket.broadcast.to('devs').emit('user-activity', 'offline', reason);
  });
}

export default sockets;
