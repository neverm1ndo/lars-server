import dgram from 'dgram';
import { DeferredPromise } from './deferredPromise';
import { decode } from 'iconv-lite';

export interface ServerGameMode {
  name: string;
  mode: string;
  lang: string;
  players: {
    online: number;
    max: number;
  },
  private: boolean;
  rules?: ServerRules;
  playersList?: ServerPlayer[];
}
interface ServerRules {
  [rule: string]: string;
}
interface ServerPlayer {
  id: number;
  name: string;
  score: number;
  ping: number;
}

enum Opcode {
  D = 'd',
  R = 'r',
  I = 'i',
}

const Errors = {
    INVALID_SOCKET: 'Invalid socket',
    UNDEFINED_GAME_MODE: 'Undefined game mode info',
} as const;

const UDP4: dgram.SocketType = 'udp4';

export class Samp {

  private _debounce: number = 1000;

  constructor(debounce?: number) {
    if (debounce) this._debounce = debounce;
  }

  private _generatePacket(ip: string, port: number, opcode: Opcode): Buffer {
    const splitedIP: number[] = ip.split('.').map(Number);
    const startPortByte: number = port & 0xFF;
    const endPortByte: number = (port >> 0) & 0xFF;
    const header: string = 'SAMP';

    return Buffer.from(header + String.fromCharCode(...splitedIP, startPortByte, endPortByte) + opcode, 'ascii');
  }

  private async _sendSocketAsync(ip: string, port: number, opcode: Opcode): Promise<Buffer | undefined> {
    try {

        let pending: DeferredPromise | null = new DeferredPromise();
        const socket: dgram.Socket = dgram.createSocket(UDP4);

        const packet: Buffer = this._generatePacket(ip, port, opcode);

        const timer: NodeJS.Timeout = setTimeout((): void => {
            if (!pending) return;

            pending.resolve();
            pending = null;
        
            socket.close();
        }, this._debounce);

        socket.send(packet, port, ip);
        socket.on("message", (message: Buffer, _rinfo: dgram.RemoteInfo) => {
            if (!pending) return;

            clearTimeout(timer);
            pending.resolve(message);

            pending = null;
        });

        return pending.promise;

    } catch (err: unknown) {
        throw err;
    }
  }

  public async getGameMode(ip: string, port: number): Promise<ServerGameMode> {
    try {
        const raw: Buffer | undefined = await this._sendSocketAsync(ip, port, Opcode.I);
        
        if (!raw) throw Errors.UNDEFINED_GAME_MODE;

        const buffer: Buffer = raw.slice(11);
        const isPrivate: boolean = Boolean(buffer.readUInt8(0));
        let offset: number = 1;

        const online: number = buffer.readUint16LE(offset);
        offset += 2;
        const maxPlayers: number = buffer.readUInt16LE(offset);
        offset += 2;
        const nameLength: number = buffer.readUInt32LE(offset);
        offset += 4;
        
        const rawName: Buffer = buffer.slice(offset, offset + nameLength);
        const name: string = decode(rawName, 'win1251');
        offset += nameLength;

        const modeLength: number = buffer.readUint32LE(offset);
        offset += 4;

        const rawMode: Buffer = buffer.slice(offset, offset + modeLength);
        const mode: string = decode(rawMode, 'win1251');
        offset += modeLength;

        const langLength: number = buffer.readUint32LE(offset);
        offset += 4;

        const rawLang: Buffer = buffer.slice(offset, offset + langLength);
        const lang: string = decode(rawLang, 'win1251');
        offset += 4; 

        return {
            name,
            mode,
            lang,
            private: isPrivate,
            players: {
                online,
                max: maxPlayers,
            },
        };
    } catch(err) {
        throw err;
    }
  }
}

export default Samp;