import { Logger } from '@shared/Logger';
import { exec } from 'child_process';
import Workgroup from '@enums/workgroup.enum';
import { Socket } from 'socket.io';
import { verifyToken, decodeToken } from '@shared/functions';
import { statsman } from '@shared/constants';


const { DEV } = Workgroup;

export const socketAuth = (socket: any, next: any) => {
  const token = socket.handshake.auth.token;
  if (!verifyToken(token)) {
    const err = new Error("not authorized");
    next(err);
  } else {
    const user = decodeToken(token);
    socket.data.username = user?.name;
    socket.data.group_id = user?.group_id;
    socket.data.id = user?.id;
    next();
  }
}

const sockets = (socket: Socket) => {
  socket.data.group_id === DEV?socket.join('devs'):socket.join('main');
  socket.on('get-room', () => {
    socket.emit('room-name', [...socket.rooms].join(', '))
  })
  socket.on('get-status', () => {
    if (socket.data.group_id !== DEV) { socket.emit('error', 'Access denied'); return; }
    exec('sudo bash /home/nmnd/get.server.state.sh', (err: any, stdout: any) => {
      if (err) { socket.emit('server-error', err.message ); return; }
      Logger.log('default', 'WS │', socket.handshake.address, socket.data.username, '-> GET_SVR_SA_STAT',  'live:' + stdout);
      socket.emit('server-status', JSON.parse(stdout)?'live':'stoped');
    });
  });
  socket.on('reboot-server', () => {
    if (socket.data.group_id !== DEV) { socket.emit('error', 'Access denied'); return; }
      let cmd: string;
      switch (process.platform) {
        case 'win32' : cmd = 'taskkill /IM samp03svr.exe'; break;
        case 'linux' : cmd = 'sudo pkill samp03svr'; break;
        default: socket.emit('error', 'LARS Server не поддерживает платформу ' + process.platform ); return;
      }
      Logger.log('default', 'WS │', socket.handshake.address, socket.data.username, '-> REBOOT_SVR_SA');
      exec(cmd, (err: any, stdout: any) => {
        if (err) { socket.emit('error', err.message ); return; }
        socket.broadcast.to('devs').emit('server-status', 'rebooting')
        socket.broadcast.emit('alert:server-rebooting', { username: socket.data.username, group_id: socket.data.group_id });
        socket.emit('server-status', 'rebooting');
        statsman.snapshot = 0;
        setTimeout(() => {
          socket.broadcast.to('devs').emit('server-rebooted', stdout);
          socket.emit('server-rebooted', stdout);
          if (process.env.NODE_ENV === 'production') {
            statsman.request('185.104.113.34', 7777, 'i').then((players: number) => {
              statsman.snapshot = players;
            }).catch((err) => {
              console.error(err);
            });
          }
          Logger.log('default', 'WS │', socket.handshake.address, socket.data.username, '-> REBOOTED_SVR_SA');
        }, 8000);
      });
  });
  socket.on('stop-server', () => {
    if (socket.data.group_id !== DEV) { socket.emit('error', 'Access denied'); return; }
    Logger.log('default', 'WS │', socket.handshake.address, socket.data.username,'-> STOP_SVR_SA');
      exec('sudo bash /home/nmnd/killer.sh', (err: any, stdout: any) => {
        if (err) { socket.emit('server-error', err.message); return; }
        socket.broadcast.to('devs').emit('server-stoped', stdout);
        socket.broadcast.emit('alert:server-stoped', { username: socket.data.username, group_id: socket.data.group_id });
        socket.emit('server-stoped', stdout);
        statsman.snapshot = 0;
        Logger.log('default', 'WS │', socket.handshake.address, socket.data.username,'-> STOPED_SVR_SA');
      });
  });
  socket.on('launch-server', () => {
    if (socket.data.group_id !== DEV) { socket.emit('error', 'Access denied'); return; }
    Logger.log('default', 'WS │', socket.handshake.address, socket.data.username, '-> LAUNCH_SVR_SA');
    socket.broadcast.to('devs').emit( 'server-status', 'loading' );
    socket.emit( 'server-status', 'loading' );
    exec(`bash /home/nmnd/starter.sh`, (err: any) => {
      if (err) { socket.emit( 'server-error', err.message ); return; }
      setTimeout(() => {
        socket.broadcast.to('devs').emit('server-launched');
        socket.emit('server-launched');
        Logger.log('default', 'WS │', socket.handshake.address, socket.data.username, '-> LAUNCHED_SVR_SA');
      }, 10000);
    });
  });
  socket.on('user-action', (action) => {
    Logger.log('default', 'WS │', socket.handshake.address, socket.data.username, '-> WS_USER_ACTION', action);
    socket.data.activity = action;
    socket.emit('user-activity', { user: socket.data.username, action})
    socket.broadcast.to('devs').emit('user-activity', { user: socket.data.username, action})
  });
  socket.on('update', () => {
    socket.emit('update:soft')
  });
  socket.on('disconnect', (reason) => {
    Logger.log('default', 'WS │', socket.handshake.address, socket.data.username, '-> DISCONNECT', reason);
    socket.broadcast.to('devs').emit('user-activity', 'offline', reason);
  });
}
export default sockets;
