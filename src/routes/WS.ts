import { Logger } from '@shared/Logger';
import { exec } from 'child_process';
import { WSMessage } from '@interfaces/ws.message';
import { ClientManager, UserActionType } from '@shared/client.manager';
import { decodeToken } from '@shared/functions';
import { URLSearchParams } from 'url';
import { User } from '@interfaces/user';

export const cm = new ClientManager();

const sockets = (ws: any, req: any) => {
  let params = new URLSearchParams(req.url);
  let user: User | null = decodeToken(params.get('/?token')!);
  if (user) {
    cm.add({ws, user});
  }
  ws.on('message', (m: string) => {
    const wsm: WSMessage = JSON.parse(m);
    switch (wsm.event) {
      case 'stop-server': {
        if (user?.group_id == 10) {
          Logger.log('default', 'WS │', req.connection.remoteAddress, user?.name,'-> STOP_SVR_SA');
          exec('sudo bash /home/nmnd/killer.sh', (err: any, stdout: any, stderr: any) => {
            if (err) { ws.send(JSON.stringify({ event: 'error', msg: err.message })); return; }
            cm.sendall({ event: 'server-stoped', msg: stdout });
          });
        } else {
          ws.send(JSON.stringify({ event: 'error', msg: 'Access not permitted' }));
        }
        break;
      }
      case 'reboot-server': {
        if (user?.group_id == 10) {
          Logger.log('default', 'WS │', req.connection.remoteAddress, user?.name, '-> REBOOT_SVR_SA');
          let cmd: string;
          switch (process.platform) {
            case 'win32' : cmd = 'taskkill /IM samp03svr.exe'; break;
            case 'linux' : cmd = 'sudo pkill samp03svr'; break;
            default: ws.send({ event: 'error', msg: 'LibertyLogs не поддерживает платформу ' + process.platform }); return;
          }
          exec(cmd, (err: any, stdout: any, stderr: any) => {
            if (err) { ws.send(JSON.stringify({ event: 'error', msg: err.message })); return; }
            cm.sendall({ event: 'server-status', msg: 'rebooting' });
            setTimeout(() => {
              cm.sendall({ event: 'server-rebooted', msg: stdout });
            }, 5000);
          });
        } else {
         ws.send(JSON.stringify({ event: 'error', msg: 'Access denied' }));
        }
        break;
      }
      case 'launch-server': {
        if (user?.group_id == 10) {
          Logger.log('default', 'WS │', req.connection.remoteAddress, user?.name, '-> LAUNCH_SVR_SA');
          exec(`bash /home/nmnd/starter.sh`, (err: any, stdout: any, stderr: any) => {
            if (err) { ws.send(JSON.stringify({ event: 'error', msg: err.message })); return; }
          });
          cm.sendall({ event: 'server-status', msg: 'loading' });
          setTimeout(() => {
            cm.sendall({ event: 'server-launched' });
          }, 10000);
          break;
        } else {
         ws.send(JSON.stringify({ event: 'error', msg: 'Access denied' }));
        }
      }
      case 'get-status': {
        Logger.log('default', 'WS │', req.connection.remoteAddress, user?.name, '-> GET_SVR_SA_STAT');
        exec('sudo bash /home/nmnd/get.server.state.sh', (err: any, stdout: any, stderr: any) => {
          if (err) { ws.send(JSON.stringify({ event: 'error', msg: err.message })); return; }
          if (Boolean(stdout)) { ws.send(JSON.stringify({ event: 'server-status', msg: 'live', options: { state: Boolean(stdout) } })); }
          else { ws.send(JSON.stringify({ event: 'server-status', msg: 'stoped', options: { state: Boolean(stdout) } })); } // FIXME: status
        });
        break;
      }
      case 'user-action': {
        Logger.log('default', 'WS │', req.connection.remoteAddress, user?.name, '-> WS_USER_ACTION', wsm.msg);
        cm.updateClientAction(ws, wsm.msg);
        break;
      }
      default: Logger.log('error', 'Unknown ws event', wsm.event); break;
    };
  });
  ws.on('close', (ws: WebSocket) => {
    Logger.log('default', 'WS │', user?.name,'-> CLOSED_CONNECTION');
    cm.remove(ws);
  });
}
export default sockets;
