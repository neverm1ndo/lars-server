import { WSMessage } from '@interfaces/ws.message';

export class ClientManager {
  pool: WebSocket[] = [];
  add(client: WebSocket) {
    this.pool.push(client);
  }
  remove(client: WebSocket) {
    this.pool.splice(this.pool.indexOf(client) , 1);
  }
  sendall(message: WSMessage) {
    this.pool.forEach((client: WebSocket) => {
      client.send(JSON.stringify(message));
    });
  }
}
