import { Logger } from '@shared/Logger';
import { exec } from 'child_process';
import { WSMessage } from '@interfaces/ws.message';

const sockets = (ws: any, req: any) => {
  ws.on('message', (m: string) => {
    const wsm: WSMessage = JSON.parse(m);
    switch (wsm.event) {
      case 'stop-server': {
        Logger.log('default', 'WS │', req.connection.remoteAddress, '-> STOP_SVR_SA', '[', req.originalUrl, ']');
        exec('ps aux | grep start.sh | grep -v grep', (err: any, stdout: any, stderr: any) => {
          if (err) { ws.send(JSON.stringify({ event: 'error', msg: err.message })); return; }
          const pid = stdout.split(' ')[1];
          exec(`kill ${pid}`, (err: any, stdout: any, stderr: any) => {
            if (err) { ws.send(JSON.stringify({ event: 'error', msg: err.message })); return; }
            ws.send(JSON.stringify({ event: 'server-stoped', msg: stdout }));
          });
        });
        break;
      }
      case 'reboot-server': {
        Logger.log('default', 'WS │', req.connection.remoteAddress, '-> STOP_SVR_SA', '[', req.originalUrl, ']');
        let cmd: string;
        switch (process.platform) {
          case 'win32' : cmd = 'taskkill /IM samp03svr.exe'; break;
          case 'linux' : cmd = 'pkill samp03svr'; break;
          default: ws.send({ event: 'error', msg: 'LibertyLogs не поддерживает платформу ' + process.platform }); return;
        }
        exec(cmd, (err: any, stdout: any, stderr: any) => {
          if (err) { ws.send(JSON.stringify({ event: 'error', msg: err.message })); return; }
          ws.send(JSON.stringify({ event: 'server-rebooted', msg: stdout }));
        });
        break;
      }
      case 'launch-server': {
        Logger.log('default', 'WS │', req.connection.remoteAddress ,'-> STOP_SVR_SA', '[', req.originalUrl, ']');
        exec(`bash ${process.env.CFG_DEV_PATH}/start.sh`, (err: any, stdout: any, stderr: any) => {
          if (err) { ws.send(JSON.stringify({ event: 'error', msg: err.message })); return; }
          ws.send(JSON.stringify({ event: 'server-launched', msg: stdout }));
        });
        break;
      }
      default: Logger.log('error', 'Unknown ws event', wsm.event); break;
    };
  });
}
export default sockets;
