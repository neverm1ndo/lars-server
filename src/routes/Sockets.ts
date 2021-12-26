import { Logger } from '@shared/Logger';
import { exec } from 'child_process';
import { ClientManager } from '@shared/client.manager';
import Workgroup from '@enums/workgroup.enum';
import { Socket } from 'socket.io';
import { verifyToken, decodeToken } from '@shared/functions'


const { DEV } = Workgroup;

export const cm = new ClientManager();

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
  if (socket.data.group_id == DEV) {
    socket.join('devs')
  } else {
    socket.join('main');
  }
  socket.on('get-room', () => {
    socket.emit('room-name', [...socket.rooms].join(', '))
  })
  socket.on('get-status', () => {
    if (socket.data.group_id !== DEV) { socket.emit('error', 'Access denied'); return; }
    Logger.log('default', 'WS │', socket.handshake.address, socket.data.username, '-> GET_SVR_SA_STAT');
    exec('sudo bash /home/nmnd/get.server.state.sh', (err: any, stdout: any) => {
      if (err) { socket.emit('server-error', err.message ); return; }
      if (Boolean(stdout)) { socket.emit('server-status', 'live', { state: Boolean(stdout) }); }
      else { socket.emit('server-status', 'stoped', { state: Boolean(stdout) }); } // FIXME: status
    });
  });
  socket.on('reboot-server', () => {
    if (socket.data.group_id !== DEV) { socket.emit('error', 'Access denied'); return; }
      Logger.log('default', 'WS │', socket.handshake.address, socket.data.username, '-> REBOOT_SVR_SA');
      let cmd: string;
      switch (process.platform) {
        case 'win32' : cmd = 'taskkill /IM samp03svr.exe'; break;
        case 'linux' : cmd = 'sudo pkill samp03svr'; break;
        default: socket.emit('error', 'LARS Server не поддерживает платформу ' + process.platform ); return;
      }
      exec(cmd, (err: any, stdout: any) => {
        if (err) { socket.emit('error', err.message ); return; }
        socket.broadcast.to('devs').emit('server-status', 'rebooting')
        socket.emit('server-status', 'rebooting')
        setTimeout(() => {
          socket.broadcast.to('devs').emit('server-rebooted', stdout);
          socket.emit('server-rebooted', stdout);
        }, 5000);
      });
  });
  socket.on('stop-server', () => {
    if (socket.data.group_id !== DEV) { socket.emit('error', 'Access denied'); return; }
      Logger.log('default', 'WS │', socket.handshake.address, socket.data.username,'-> STOP_SVR_SA');
      exec('sudo bash /home/nmnd/killer.sh', (err: any, stdout: any) => {
        if (err) { socket.emit('server-error', err.message); return; }
        socket.broadcast.to('devs').emit('server-stoped', stdout);
        socket.emit('server-stoped', stdout);
      });
  });
  socket.on('launch-server', () => {
    if (socket.data.group_id !== DEV) { socket.emit('error', 'Access denied'); return; }
    Logger.log('default', 'WS │', socket.handshake.address, socket.data.username, '-> LAUNCH_SVR_SA');
    exec(`bash /home/nmnd/starter.sh`, (err: any) => {
      if (err) { socket.emit( 'server-error', err.message ); return; }
    });
    socket.broadcast.to('devs').emit( 'server-status', 'loading' );
    socket.emit( 'server-status', 'loading' );
    setTimeout(() => {
      socket.broadcast.to('devs').emit('server-launched');
      socket.emit('server-launched');
    }, 10000);
  });
  socket.on('user-action', (action) => {
    Logger.log('default', 'WS │', socket.handshake.address, socket.data.username, '-> WS_USER_ACTION', action);
    socket.data.activity = action;
    socket.emit('user-activity', { user: socket.data.username, action})
  });
}
export default sockets;