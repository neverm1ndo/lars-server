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
  sendall(message: WSMessage) {
    this.pool.forEach((client: WebSocket) => {
      client.send(JSON.stringify(message));
    });
  }
}
