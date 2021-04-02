import { WSMessage } from '@interfaces/ws.message';
import { User } from '@interfaces/user';
import { Logger } from '@shared/Logger';
type UserActionType = 'redacting' | 'idle' | 'inlogs' | 'inmaps';

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
    this.cleared.forEach((username: string) => {
      if (client.user.name == username) {
        this.closeSession(username);
      } else {
        this.pool.push(client);
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
        reject(client);
    }).then((client: Client) => {
      Logger.log('error', ' [CM] Client %s removed', client.user.name);
      this.pool.splice(this.pool.indexOf(client) , 1);
    }).catch(() => { Logger.log('error', ' [CM] Client %s does not exists')})
  }
  // updateClientAction(ws: WebSocket, action: UserActionType) {
  //   this.pool.forEach((client: Client, index: number) => {
  //     if (client.ws == ws) {
  //       this.pool[index].action!.type = action;
  //       this.sendall({ event: 'user-activity', msg: JSON.stringify({ user: client.user.name, action: action })})
  //     }
  //   });
  // }
  closeSession(username: string) {
    this.cleared.push(username);
    this.pool.forEach((client: Client) => {
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
