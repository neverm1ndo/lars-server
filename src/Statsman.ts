import { LogLine } from '@interfaces/logline';
import { Processes } from '@enums/processes.enum';
import { STAT } from '@schemas/stat.schema';
import dgram from 'dgram';

namespace Statsman {
  class Metric {
    private value: number = 0;
    get snapshot(): number {
      return this.value;
    }
    set snapshot(val: number) {
      this.value = val;
    }
    constructor() {
    }
    inc(): void {
      this.value++;
    };
    dec(): void {
      this.value--;
    }
  }
  export class OnlineMetric extends Metric {
    constructor() {
      super();
      this.request('185.104.113.34', 7777, 'i').then((players: number) => {
        this.snapshot = players;
      }).catch((err) => {
        console.error(err);
      });
    }
    disconnectProcesses: string[] = [
      Processes.DISCONNECT_BAN,
      Processes.DISCONNECT_KICK,
      Processes.DISCONNECT_LEAVE,
      Processes.DISCONNECT_KICKBAN,
      Processes.DISCONNECT_TIMEOUT,
    ]
    update(line: LogLine): void {
      if (line.process === Processes.CONNECTION_CONNECT) { this.inc(); return; }
      if (this.disconnectProcesses.includes(line.process)) this.dec();
    }
    request(ip: string, port: number, opcode: string): Promise<number> {
       return new Promise((resolve, reject) => {
           const socket = dgram.createSocket("udp4");
           let packet: Buffer = Buffer.alloc(10 + opcode.length);
           packet.write('SAMP');
           packet[4] = Number(ip.split('.')[0]);
           packet[5] = Number(ip.split('.')[1]);
           packet[6] = Number(ip.split('.')[2]);
           packet[7] = Number(ip.split('.')[3]);
           packet[8] = port & 0xFF;
           packet[9] = port >> 8 & 0xFF;
           packet[10] = opcode.charCodeAt(0);
           try {
             socket.send(packet, 0, packet.length, port, ip);
           } catch (err) {
             console.error(err);
           }
           let controller: NodeJS.Timeout = setTimeout(() => {
               socket.close();
               console.error(new Error(`Server ${ip}:${port} is unavalible`))
               reject(new Error(`Server ${ip}:${port} is unavalible`));
           }, 3000);
           socket.on('message', (message: Buffer) => {
               if (controller) clearTimeout(controller);
               if (message.length < 11) {
                   reject(new Error(`Invalid socket on message: ${message} > ${message.toString()}`));
               } else {
                   socket.close();
                   message = message.slice(11);
                   resolve(message.readUInt16LE(1))
               }
           });
       })
   }
    tail(): any {
      const now: Date = new Date();
      const months: string[] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Augt", "Sep", "Oct", "Nov", "Dec"];
      const date: Date = new Date(`${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`);
      STAT.updateOne({ date: date , label: 'online' }, { $push: { data: { $each: [this.snapshot], $slice: -24 }}}, { upsert: true, setDefaultsOnInsert: true }, (err) => {
        if (err) return console.error(err);
      });
    }
  }
}

export default Statsman;
