import { WSMessage } from '@interfaces/ws.message';
import { User } from '@interfaces/user';
import { decodeToken } from '@shared/functions';

export interface Client {
  user: User;
  ws: WebSocket;
  action?: {
    type: 'redacting' | 'idle';
    path?: string;
  };
}

export class ClientManager {

  pool: WebSocket[] = [];

  add(client: WebSocket) {
    this.pool.push(client);
  }
  remove(client: WebSocket) {
    this.pool.splice(this.pool.indexOf(client) , 1);
    // new Promise<Client>((resolve: any, reject: any) => {
    //     this.pool.forEach((client: Client) => {
    //       if (client.ws == ws) {
    //         resolve(client);
    //       }
    //     });
    //     reject();
    // }).then((client: Client) => {
    //   this.pool.splice(this.pool.indexOf(client) , 1);
    // }).catch(() => { console.error('[client-manager] client not exists')})
  }
  closeSession(username: string) {
    this.pool.forEach((client: WebSocket) => {
      const url = new URL(client.url);
      const token = url.searchParams.get('token');
      if (token) {
        if (username == decodeToken(token)?.name!) {
          client.send(JSON.stringify({ event: 'expire-token', message: 'You session closed by admin' }));
        }
      }
    })
  }
  sendall(message: WSMessage) {
    this.pool.forEach((client: WebSocket) => {
      client.send(JSON.stringify(message));
    });
  }
}
