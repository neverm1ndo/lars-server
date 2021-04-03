import { WSMessage } from '@interfaces/ws.message';
import { User } from '@interfaces/user';
import { Logger } from '@shared/Logger';
export type UserActionType = 'redacting' | 'idle' | 'inlogs' | 'inmaps' | 'inadm';

export interface Client {
  user: User;
  ws: WebSocket;
  action?: {
    type: UserActionType;
    path?: string;
  };
}

export class ClientManager {

  pool: Client[] = [];
  cleared: string[] = [];

  add(client: Client) {
    this.pool.push(client);
    this.cleared.forEach((username: string) => {
      if (client.user.name == username) {
        this.closeSession(username);
      }
    });
  }
  remove(client: WebSocket) {
    // this.pool.splice(this.pool.indexOf(client) , 1);
    new Promise<Client>((resolve: any, reject: any) => {
        this.pool.forEach((poolClient: Client) => {
          if (client == poolClient.ws) {
            resolve(poolClient);
          }
        });
    }).then((client: Client) => {
      Logger.log('error', `CM | Client ${client.user.name} removed`);
      this.pool.splice(this.pool.indexOf(client) , 1);
      Logger.log('error', this.pool);
    })
  }
  updateClientAction(ws: WebSocket, action: any) {
    this.pool.forEach((client: Client, index: number) => {
      if (client.ws == ws) {
        this.pool[index].action = { type: action };
        this.sendall({ event: 'user-activity', msg: JSON.stringify({ user: client.user.name, action: action })})
      }
    });
  }
  closeSession(username: string) {
    this.cleared.push(username);
    this.pool.forEach((client: Client) => {
      console.log(username == client.user.name, this.pool);
      if (username == client.user.name) {
        Logger.log('default', 'Closing session for', username, '| Clients pool:', this.pool )
        client.ws.send(JSON.stringify({ event: 'expire-token', message: 'You session closed by admin' }));
        this.cleared.splice(this.cleared.indexOf(username) , 1);
      };
    })
  }
  sendall(message: WSMessage) {
    this.pool.forEach((client: Client) => {
      client.ws.send(JSON.stringify(message));
    });
  }
}
