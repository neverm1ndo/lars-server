import { WSMessage } from '@interfaces/ws.message';
import { User } from '@interfaces/user';

type UserAction = 'redacting' | 'idle' | 'inlogs' | 'inmaps';

export interface Client {
  user: User;
  ws: WebSocket;
  action?: {
    type: UserAction;
    path?: string;
  };
}

export class ClientManager {

  pool: Client[] = [];

  add(client: Client) {
    this.pool.push(client);
  }
  remove(client: WebSocket) {
    // this.pool.splice(this.pool.indexOf(client) , 1);
    new Promise<Client>((resolve: any, reject: any) => {
        this.pool.forEach((poolClient: Client) => {
          if (client == poolClient.ws) {
            resolve(client);
          }
        });
        reject();
    }).then((client: Client) => {
      this.pool.splice(this.pool.indexOf(client) , 1);
    }).catch(() => { console.error('[client-manager] client not exists')})
  }
  updateClientAction(ws: WebSocket, action: UserAction) {
    this.pool.forEach((client: Client, index: number) => {
      if (client.ws == ws) {
        this.pool[index].action!.type = action;
        this.sendall({ event: 'user-activity', msg: JSON.stringify({ user: client.user.name, action: action })})
      }
    });
  }
  closeSession(username: string) {
    this.pool.forEach((client: Client) => {
      if (username == client.user.name) {
        client.ws.send(JSON.stringify({ event: 'expire-token', message: 'You session closed by admin' }));
      }
    })
  }
  sendall(message: WSMessage) {
    this.pool.forEach((client: Client) => {
      client.ws.send(JSON.stringify(message));
    });
  }
}
