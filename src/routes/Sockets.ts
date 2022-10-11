import { Logger } from '@shared/Logger';
import Workgroup from '@enums/workgroup.enum';
import { Socket } from 'socket.io';
import { io } from '../index';
import { verifyToken, decodeToken } from '@shared/functions';
import { samp } from '@shared/constants';


const { DEV } = Workgroup;

enum ServerStatus {
  OFFLINE = 1,
  REBOOTING,
  LIVE,
  LAUNCHING,
}

const isDev = (socket: Socket): boolean => {
  if (socket.data.main_group !== DEV) { 
    socket.emit('error', 'Access denied'); 
    return false; 
  }
  return true;
}

export const socketAuth = (socket: any, next: any) => {
  const token = socket.handshake.auth.token;
  if (!verifyToken(token)) {
    const err = new Error("not authorized");
    next(err);
  } else {
    const { id, username, main_group } = decodeToken(token)!;
    socket.data.id = id;
    socket.data.username = username;
    socket.data.main_group = main_group;
    next();
  }
}

const sockets = (socket: Socket) => {
  socket.data.main_group === DEV ? socket.join('devs')
                                 : socket.join('main');
  
  socket.on('get-room', () => {
    socket.emit('room-name', [...socket.rooms].join(', '))
  });

  socket.on('get-status', () => {
    if (socket.data.main_group !== DEV) { 
      socket.emit('error', 'Access denied'); 
      return; 
    }
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
    
    Logger.log('default', 'SOCKET │', socket.handshake.address, socket.data.username, '-> REBOOT_SVR_SA');
    
    io.sockets.emit('server-status', ServerStatus.REBOOTING);
    io.sockets.emit('alert:server-rebooting', { 
      username: socket.data.username, 
      group_id: socket.data.main_group 
    });
    
    samp.reboot()
        .then(() => {
          socket.broadcast.to('devs').emit('server-rebooted');
          Logger.log('default', 'SOCKET │', socket.handshake.address, socket.data.username, '-> REBOOTED_SVR_SA');
        })
        .catch((err) => {
          socket.emit('server-error', err);
        });
  });

  socket.on('stop-server', () => {
    if (!isDev(socket)) return;
    
    Logger.log('default', 'SOCKET │', socket.handshake.address, socket.data.username,'-> STOP_SVR_SA');
    samp.stop()
        .then((stdout) => {
          io.sockets.emit('server-stoped', stdout);
          socket.broadcast.emit('alert:server-stoped', { 
            username: socket.data.username, 
            group_id: socket.data.main_group 
          });
          Logger.log('default', 'SOCKET │', socket.handshake.address, socket.data.username,'-> STOPED_SVR_SA');
        })
        .catch((err) => {
          io.sockets.emit('server-error', err);
        });
  });

  socket.on('launch-server', () => {
    if (!isDev(socket)) return;
    
    Logger.log('default', 'SOCKET │', socket.handshake.address, socket.data.username, '-> LAUNCH_SVR_SA');

    io.emit('server-status', ServerStatus.LAUNCHING);
    
    samp.launch()
        .then((stdout) => {
          io.sockets.emit('server-launched', stdout);
          Logger.log('default', 'SOCKET │', socket.handshake.address, socket.data.username, '-> LAUNCHED_SVR_SA');
        })
        .catch((err) => {
          io.sockets.emit('server-error', err);
        });
  });

  socket.on('user-action', (action) => {
    Logger.log('default', 'SOCKET │', socket.handshake.address, socket.data.username, '-> SOCKET_USER_ACTION', action);
    
    socket.data.activity = action;
    io.sockets.emit('user-activity', { 
      user: socket.data.username, 
      action
    });
  });

  socket.on('update', () => {
    socket.emit('update:soft');
  });

  socket.on('disconnect', (reason) => {
    Logger.log('default', 'SOCKET │', socket.handshake.address, socket.data.username, '-> DISCONNECT', reason);
    socket.broadcast.to('devs').emit('user-activity', 'offline', reason);
  });
}

export default sockets;
