import { WSMessage } from '@interfaces/ws.message';
import { User } from '@interfaces/user';

export interface Client {
  user: User;
  ws: WebSocket;
  action?: {
    type: 'redacting' | 'idle';
    path?: string;
  };
}

export class ClientManager {

  pool: Client[] = [];

  add(client: Client) {
    this.pool.push(client);
  }
  remove(ws: WebSocket) {
    new Promise<Client>((resolve: any, reject: any) => {
        this.pool.forEach((client: Client) => {
          if (client.ws == ws) {
            resolve(client);
          }
        });
        reject();
    }).then((client: Client) => {
      this.pool.splice(this.pool.indexOf(client) , 1);
    }).catch(() => { console.error('[client-manager] client not exists')})
  }
  sendall(message: WSMessage) {
    this.pool.forEach((client: Client) => {
      client.ws.send(JSON.stringify(message));
    });
  }
}
