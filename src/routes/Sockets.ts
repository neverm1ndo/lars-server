import { Logger } from '@shared/Logger';
import Workgroup from '@enums/workgroup.enum';
import { Socket } from 'socket.io';
import { io } from '../index';
import { samp } from '@shared/constants';
import { getAvatarURL } from '@shared/functions';
import { ISocket } from '@interfaces/httpio.enum';


const { DEV } = Workgroup;

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
  
  Logger.log('default', 'SOCKET |', socket.request.user?.username, 'connected');
  
  socket.on('get-status', () => {
    if (!isDev(socket)) return; 
    samp.status.then((status: boolean) => {
                  socket.emit('server-status', status ? ServerStatus.LIVE : ServerStatus.OFFLINE);
                })
                .catch((err) => {
                  Logger.log('error', err.message);
                  socket.emit('server-error', err);
                });
  });

  socket.on('reboot-server', () => {
    if (!isDev(socket)) return;
    
    Logger.log('default', 'SOCKET │', socket.handshake.address, socket.request.user?.username, '-> REBOOT_SVR_SA');
    
    io.sockets.emit('server-status', ServerStatus.REBOOTING);
    io.sockets.emit('alert:server-rebooting', { 
      username: socket.request.user?.username, 
      user_avatar: getAvatarURL(socket.request.user?.user_avatar!),
      group_id: socket.request.user?.main_group,
    });
    
    samp.reboot()
        .then(() => {
          socket.broadcast.to('devs').emit('server-rebooted');
          io.sockets.emit('server-status', ServerStatus.LIVE);
          Logger.log('default', 'SOCKET │', socket.handshake.address, socket.request.user?.username, '-> REBOOTED_SVR_SA');
        })
        .catch((err) => {
          Logger.log('error', err.message);
          socket.broadcast.to('devs').emit('server-error', err);
        });
  });

  socket.on('stop-server', () => {
    if (!isDev(socket)) return;
    
    Logger.log('default', 'SOCKET │', socket.handshake.address, socket.request.user?.username,'-> STOP_SVR_SA');
    samp.stop()
        .then((stdout) => {
          io.sockets.emit('server-stoped', stdout);
          io.sockets.emit('server-status', ServerStatus.OFFLINE);
          socket.broadcast.emit('alert:server-stoped', { 
            username: socket.data.username, 
            group_id: socket.data.main_group 
          });
          Logger.log('default', 'SOCKET │', socket.handshake.address, socket.request.user?.username,'-> STOPED_SVR_SA');
        })
        .catch((err) => {
          Logger.log('error', err.message);
          socket.broadcast.to('devs').emit('server-error', err);
        });
  });

  socket.on('launch-server', () => {
    if (!isDev(socket)) return;
    
    Logger.log('default', 'SOCKET │', socket.handshake.address, socket.request.user?.username, '-> LAUNCH_SVR_SA');

    io.emit('server-status', ServerStatus.LAUNCHING);
    
    samp.launch()
        .then((stdout) => {
          io.sockets.emit('server-launched', stdout);
          Logger.log('default', 'SOCKET │', socket.handshake.address, socket.request.user?.username, '-> LAUNCHED_SVR_SA');
        })
        .catch((err) => {
          Logger.log('error', err.message);
          socket.broadcast.to('devs').emit('server-error', err);
        });
  });

  socket.on('user-action', (action) => {
    Logger.log('default', 'SOCKET │', socket.handshake.address, socket.request.user?.username, '-> SOCKET_USER_ACTION', UserActivity[action]);
    
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
    Logger.log('default', 'SOCKET │', socket.handshake.address, socket.request.user?.username, '-> DISCONNECT', reason);
    socket.broadcast.to('devs').emit('user-activity', 'offline', reason);
  });
}

export default sockets;
