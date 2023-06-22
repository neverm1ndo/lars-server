import { createReadStream, ReadStream, Stats, watchFile } from 'fs';
import { stat, readdir, access, writeFile } from 'fs/promises';
import { Stream } from 'stream';
import chokidar from 'chokidar';
import * as path from 'path';
import bufferSplit from 'buffer-split';
import { ANSItoUTF8 } from '@shared/functions';
import { EOL } from 'os';

export class Watcher {

  private readonly __options: chokidar.WatchOptions = {
    ignored: /(^|[\/\\])\../,
    persistent: true,
  }
  
  private _fsWatcher: chokidar.FSWatcher = chokidar.watch(process.env.LOGS_PATH!, this.__options);

  private _bytes: number = 0;
  private _stream: Stream = new Stream();
  private _serverLogStream: Stream = new Stream();
  
  public overwatch(): Stream {
    this._getLastLogFileStat()
        .then((stats: Stats) => {
          this._bytes = stats.size === 0 ? 0 : stats.size;
        });
   
    this._fsWatcher.on('change', (path, stats) => this._fsWatcherHandler(path, stats));
    this._fsWatcher.on('add', (path, stats) => this._fsWatcherNewFileHandler(path, stats));
    this._fsWatcher.on('error', console.error);
    return this._stream;
  }

  public async serverLogWatch(logpath: string): Promise<Stream> {
    if (!logpath || process.env.NODE_ENV === 'development') return this._serverLogStream;

    function __watch(this: Watcher): Stream {
      watchFile(logpath, { persistent: true, interval: 2000 }, async (curr: Stats, prev: Stats) => {
        if (curr.size <= prev.size) return;
        const readStream: ReadStream = createReadStream(logpath, {
          start: prev.size,
          end: curr.size,
        });
        readStream.on('readable', async () => {
          const data: Buffer | null = readStream.read();
          if (!data) return readStream.destroy();
          
          this._serverLogStream.emit('data', ANSItoUTF8(data).toString());
        });
      });
      return this._serverLogStream;
    }

    try {
      await access(logpath);
    } catch(error) {
      await writeFile(logpath, '');
    } finally {
      return __watch.call(this);
    }
  }

  private async _getLastLogFileStat(): Promise<Stats> {
    
    const now: Date = new Date();
    
    const [date, month, year]: string[] = [
      now.getDate(), 
      now.getMonth() + 1, 
      now.getFullYear(),
    ].map((val: number) => val.toString().padStart(2, '0'));
   
    let filepath: string = path.join(process.env.LOGS_PATH!, year, month,`${year}${month}${date}.log`);

    try {
      return await stat(filepath);
    } catch(error) {
      const dirpath: string = path.dirname(filepath);
      const dir: string[] = await readdir(dirpath);
      
      filepath = path.join(dirpath, dir[dir.length - 1]);
      
      return await stat(filepath);
    }
  }

  private _fsWatcherNewFileHandler(_path: string, stats?: Stats | undefined): void {
    this._bytes = stats?.size ? stats.size : 0;
  }

  private _fsWatcherHandler(path: string, stats?: Stats | undefined): void {
    
    if (!stats) return;
    
    if (stats.size <= this._bytes) {
      return;
    }

    const stream: ReadStream = createReadStream(path, {
      start: this._bytes,
      end: stats.size - 2,
    });
    
    stream.on('readable', () => {
      const data: Buffer | null = stream.read();
      
      if (!data) return stream.destroy();
      
      const newLines: Buffer[] = bufferSplit(data, Buffer.from(EOL));

      for (let line of newLines) {
        this._stream.emit('data', line);
      }
    
    });
    
    this._bytes = stats.size;  
  }

}
