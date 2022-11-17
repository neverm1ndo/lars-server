import { createReadStream, ReadStream, Stats } from 'fs';
import { stat, readdir } from 'fs/promises';
import { Stream } from 'stream';
import chokidar from 'chokidar';
import * as path from 'path';
import bufferSplit from 'buffer-split';

export class Watcher {
  
  private _fsWatcher: chokidar.FSWatcher = chokidar.watch(process.env.LOGS_PATH!, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
  });

  private _bytes: number = 0;
  private _stream: Stream = new Stream();
  
  public overwatch(): Stream {
    this._getLastLogFileStat()
        .then((stats: Stats) => {
          this._bytes = stats.size + 2;
        });
    this._fsWatcher.on('change', (path, stats) => this._fsWatcherHandler(path, stats));
    this._fsWatcher.on('error', console.error);
    return this._stream;
  }

  private async _getLastLogFileStat(): Promise<Stats> {
    
    const now: Date = new Date();
    
    const [date, month, year] = [
      now.getDate().toString(), 
     (now.getMonth() + 1).toString(), 
      now.getFullYear().toString(),
    ].map((val: string) => '00'.substring(0, 2 - val.length) + val);
   
    let filepath = path.join(process.env.LOGS_PATH!, year, month,`${year}${month}${date}.log`);

    try {
      return await stat(filepath);
    } catch(error) {
      const dirpath: string = path.dirname(filepath);
      const dir: string[] = await readdir(dirpath);
      
      filepath = path.join(dirpath, dir[dir.length - 1]);
      
      return await stat(filepath);
    }
  }

  private _fsWatcherHandler(path: string, stats?: Stats | undefined): void {
    
    if (!stats) return;
    
    if (stats.size <= this._bytes) {
      this._bytes = 0;
    }

    const stream: ReadStream = createReadStream(path, {
      start: this._bytes,
      end: stats.size - 1,
    });
    
    stream.on('readable', () => {
      const data: Buffer | null = stream.read();
      
      if (!data) return stream.destroy();
      
      const newLines: Buffer[] = bufferSplit(data, Buffer.from('\n'));

      for (let line of newLines) {
        this._stream.emit('data', line);
      }
    
    });
    
    this._bytes = stats.size + 2;  
  }

}
