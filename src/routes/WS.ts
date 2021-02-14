import { Logger } from '@shared/Logger';
import { exec } from 'child_process';
import { WSMessage } from '@interfaces/ws.message';
import { ClientManager } from '@shared/client.manager';

const cm = new ClientManager();


const sockets = (ws: any, req: any) => {
  cm.add(ws);
  ws.on('message', (m: string) => {
    const wsm: WSMessage = JSON.parse(m);
    switch (wsm.event) {
      case 'stop-server': {
        Logger.log('default', 'WS │', req.connection.remoteAddress, '-> STOP_SVR_SA');
        exec('sudo bash /home/nmnd/killer.sh', (err: any, stdout: any, stderr: any) => {
          if (err) { ws.send(JSON.stringify({ event: 'error', msg: err.message })); return; }
          cm.sendall({ event: 'server-stoped', msg: stdout });
        });
        break;
      }
      case 'reboot-server': {
        Logger.log('default', 'WS │', req.connection.remoteAddress, '-> REBOOT_SVR_SA');
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
        break;
      }
      case 'launch-server': {
        Logger.log('default', 'WS │', req.connection.remoteAddress ,'-> LAUNCH_SVR_SA');
        exec(`bash /home/nmnd/starter.sh`, (err: any, stdout: any, stderr: any) => {
          if (err) { ws.send(JSON.stringify({ event: 'error', msg: err.message })); return; }
        });
        cm.sendall({ event: 'server-status', msg: 'loading' });
        setTimeout(() => {
          cm.sendall({ event: 'server-launched' });
        }, 10000);
        break;
      }
      case 'get-status': {
        Logger.log('default', 'WS │', req.connection.remoteAddress ,'-> GET_SVR_SA_STAT');
        exec('sudo bash /home/nmnd/get.server.state.sh', (err: any, stdout: any, stderr: any) => {
          if (err) { ws.send(JSON.stringify({ event: 'error', msg: err.message })); return; }
          if (Boolean(stdout)) { ws.send(JSON.stringify({ event: 'server-status', msg: 'live', options: { state: Boolean(stdout) } })); }
          else { ws.send(JSON.stringify({ event: 'server-status', msg: 'stoped', options: { state: Boolean(stdout) } })); } // FIXME: status
        });
        break;
      }
      default: Logger.log('error', 'Unknown ws event', wsm.event); break;
    };
  });
  ws.on('close', (ws: WebSocket) => {
    cm.remove(ws);
  });
}
export default sockets;
