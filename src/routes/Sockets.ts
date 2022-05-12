import { Logger } from '@shared/Logger';
import Workgroup from '@enums/workgroup.enum';
import { Socket } from 'socket.io';
import { verifyToken, decodeToken } from '@shared/functions';
import { samp } from '@shared/constants';


const { DEV } = Workgroup;

export const socketAuth = (socket: any, next: any) => {
  const token = socket.handshake.auth.token;
  if (!verifyToken(token)) {
    const err = new Error("not authorized");
    next(err);
  } else {
    const user = decodeToken(token);
    socket.data.id = user?.id;
    socket.data.username = user?.username;
    socket.data.main_group = user?.main_group;
    next();
  }
}

const sockets = (socket: Socket) => {
  socket.data.main_group === DEV?socket.join('devs'):socket.join('main');

  socket.on('get-room', () => {
    socket.emit('room-name', [...socket.rooms].join(', '))
  });

  socket.on('get-status', () => {
    if (socket.data.main_group !== DEV) { socket.emit('error', 'Access denied'); return; }
    samp.status.then((status: boolean) => {
      socket.emit('server-status', status?3:1);
    }).catch((err) => {
      socket.emit('server-error', err);
    });
  });

  socket.on('reboot-server', () => {
    if (socket.data.main_group !== DEV) { socket.emit('error', 'Access denied'); return; }
      Logger.log('default', 'SOCKET │', socket.handshake.address, socket.data.username, '-> REBOOT_SVR_SA');
      socket.broadcast.to('devs').emit('server-status', 2);
      socket.emit('server-status', 2);
      socket.broadcast.emit('alert:server-rebooting', { username: socket.data.username, group_id: socket.data.main_group });
      samp.reboot().then((_stdout) => {
        socket.emit('server-status', 3);
        socket.broadcast.to('devs').emit('server-status', 3);
        Logger.log('default', 'SOCKET │', socket.handshake.address, socket.data.username, '-> REBOOTED_SVR_SA');
      }).catch((err) => {
        socket.emit('server-error', err);
      });
  });

  socket.on('stop-server', () => {
    if (socket.data.main_group !== DEV) { socket.emit('error', 'Access denied'); return; }
    Logger.log('default', 'SOCKET │', socket.handshake.address, socket.data.username,'-> STOP_SVR_SA');
    samp.stop().then((stdout) => {
      socket.emit('server-stoped', stdout);
      socket.broadcast.to('devs').emit('server-stoped', stdout);
      socket.broadcast.emit('alert:server-stoped', { username: socket.data.username, group_id: socket.data.main_group });
      Logger.log('default', 'SOCKET │', socket.handshake.address, socket.data.username,'-> STOPED_SVR_SA');
    }).catch((err) => {
      socket.emit('server-error', err);
    });
  });

  socket.on('launch-server', () => {
    if (socket.data.main_group !== DEV) { socket.emit('error', 'Access denied'); return; }
    Logger.log('default', 'SOCKET │', socket.handshake.address, socket.data.username, '-> LAUNCH_SVR_SA');
    socket.broadcast.to('devs').emit('server-status', 4);
    socket.emit('server-status', 4);
    samp.launch().then(() => {
      socket.broadcast.to('devs').emit('server-status', 3);
      socket.emit('server-status', 3);
      Logger.log('default', 'SOCKET │', socket.handshake.address, socket.data.username, '-> LAUNCHED_SVR_SA');
    }).catch((err) => {
      socket.emit('server-error', err);
    })
  });

  socket.on('user-action', (action) => {
    Logger.log('default', 'SOCKET │', socket.handshake.address, socket.data.username, '-> SOCKET_USER_ACTION', action);
    socket.data.activity = action;
    socket.emit('user-activity', { user: socket.data.username, action});
    socket.broadcast.to('devs').emit('user-activity', { user: socket.data.username, action});
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
