import { EOL } from 'os';

import { isObject } from 'lodash';
import { UpdateResult } from 'mongodb';

import { omp } from '@shared/constants';
import { logger } from '@shared/logger';
import { STAT } from '@schemas/stat.schema';
import Samp, { ServerGameMode } from '@shared/samp';

export interface OnlineMetricChart {
  data: number[];
  labels: Date[];
  date?: Date;
  label?: string;
}

export class OnlineMetric {

    public getDailyOnlineChart(date: Date): Promise<OnlineMetricChart | null> {
        const day: number = date.setHours(0, 0, 0, 0);

        return STAT.findOne<OnlineMetricChart>({ date: day })
                    .exec();
    }

    private async _getServerOnline(): Promise<ServerGameMode> {
        try {
            const SERVER_IP: string | undefined = process.env.SERVER_IP;
            let SERVER_PORT: string | number | undefined  = process.env.SERVER_PORT;

            if (!SERVER_IP || !SERVER_PORT) throw new Error('SERVER_IP or SERVER_PORT is undefined');
                SERVER_PORT = Number(SERVER_PORT);
            
            if (Number.isNaN(SERVER_PORT)) throw new Error('SERVER_PORT is NaN');
            
            const samp: Samp = new Samp(10000);

            return samp.getGameMode(SERVER_IP, SERVER_PORT);
        } catch (err) {
            logger.err(err);

            throw err;
        }
    }

    public async tail(label: string): Promise<UpdateResult | undefined> {
      try {
        const date: Date = new Date();

        const isServerUp = await omp.getServerStatus();
        
        if (!isServerUp) throw new Error(`OMP server by address ${process.env.SERVER_IP} is down. Tail "${label}" metric skiped.`)

        const online: number = await this._getServerOnline()
                                         .then(({ players }: ServerGameMode) => players.online);
        
        return await STAT.updateOne<OnlineMetricChart>({ date: date.setHours(0, 0, 0, 0), label }, 
                              { $push: { data: online, labels: date }}, 
                              { upsert: true, setDefaultsOnInsert: true })
                          .exec();
      } catch (err) {
        logger.err(err);
      }
    }

    public onInit(): void { 
      this._getServerOnline()
          .then((gameMode: ServerGameMode) => {
            logger.log(
              '[METRICS]','[SRV_GAME_MODE]', 'Got game mode data:\n',
                ...Object.entries(gameMode)
                        .map(([key, val]: string[]) => {
                            if (!isObject(val)) {
                                return [key, val];
                            }
                            
                            const nested = Object.values(val)
                                                    .join('/');
                            
                            return [key, nested];
                        })
                        .map(([key, val]: string[]) => '\t'.repeat(6) + key + ': ' + val + EOL)
            );

            // this.snapshot.online = gameMode.players.online;
          })
          .catch((err: any) => {
            logger.err(err);
          });
    }
}