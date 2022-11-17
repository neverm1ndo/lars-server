import { ILogLine } from '@interfaces/logline';
import { Processes } from '@enums/processes.enum';
import { STAT } from '@schemas/stat.schema';
import { LOG_LINE } from '@schemas/logline.schema';
import dgram from 'dgram';
// import { getTodayDate } from '@shared/functions'
import { Logger } from '@shared/Logger';

namespace Statsman {
  class Metric {
    private value: number = 0;
    get snapshot(): number {
      return this.value;
    }
    get nowTime(): Date {
      return new Date();
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
      if (this.value > 0) this.value--;
    }
  }
  export class OnlineMetric extends Metric {
    constructor() {
      super();
      if (process.env.NODE_ENV === 'production') {
        this.request(process.env.SERVER_IP!, Number(process.env.SERVER_PORT!), 'i').then((players: number) => {
          this.snapshot = players;
        }).catch((err) => {
          console.error(err);
        });
      }
    }
    disconnectProcesses: string[] = [
      Processes.DISCONNECT_BAN,
      Processes.DISCONNECT_KICK,
      Processes.DISCONNECT_LEAVE,
      Processes.DISCONNECT_KICKBAN,
      Processes.DISCONNECT_TIMEOUT,
    ]
    update(line: ILogLine): Promise<void> {
      return new Promise((resolve, reject) => {
        if (line.process === Processes.CONNECTION_CONNECT) { this.inc(); this.tail(); resolve(); }
        if (this.disconnectProcesses.includes(line.process)) { this.dec(); this.tail(); resolve(); }
        reject();
      })
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
       });
   }
    tail(): any {
      STAT.updateOne({ date: new Date().setHours(0, 0, 0, 0) , label: 'online' }, { $push: { data: this.snapshot, labels: new Date() }}, { upsert: true, setDefaultsOnInsert: true }, (err) => {
        if (err) return console.error(err);
      });
    }
  }
  export function getChatStats (from: Date, to: Date) {
    return LOG_LINE.aggregate([
      {
        '$match': {
          'date': {
            '$gte': from,
            '$lte': to
          }
        }
      }, {
        '$facet': {
          'main': [{'$match': {'process': Processes.CHAT_MAIN }}, {'$count': 'total'}],
          'pm': [{'$match': {'process': Processes.CHAT_PM}}, {'$count': 'total'}],
          'mutes': [{'$match': {'process': {'$in': [Processes.CHAT_MUTE_HAND, Processes.CHAT_MUTE_AUTO]}}}, {'$count': 'total'}],
          'kicks': [{'$match': {'process': {'$in': [Processes.DISCONNECT_KICK, Processes.DISCONNECT_KICKBAN]}}}, {'$count': 'total'}],
          'bans': [{'$match': {'process': {'$in': [Processes.DISCONNECT_BAN, Processes.CN_BAN_HAND]}}}, {'$count': 'total'}],
          'weapByes': [{'$match': {'process': Processes.WEAP_BUY}}, {'$count': 'total'}],
          'kills': [{$match: {process: Processes.DEATH_KILLED }}, {'$group': {  _id: '$content.message',  'total': { '$sum': 1 }}}],
        }
      }, {
        '$project': {
          'main': {'$arrayElemAt': ['$main', 0]},
          'pm': {'$arrayElemAt': ['$pm', 0]},
          'mutes': {'$arrayElemAt': ['$mutes', 0]},
          'kicks': {'$arrayElemAt': ['$kicks', 0]},
          'bans': {'$arrayElemAt': ['$bans', 0]},
          'kills': '$kills'
        }
      }
    ])
  }
}

export default Statsman;
