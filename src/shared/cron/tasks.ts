import Backuper from "@backuper";
import { onlineMetric } from "@shared/constants";
import { logger } from "@shared/logger";
import { CronJob } from "cron";

export const tailOnlineStats = new CronJob('0 */60 * * * *', () => {
    void (async() => {
      await onlineMetric.tail('online');
    })();
  });
  
  export const rmOldBackups = new CronJob('0 0 0 */1 * *', () => {
    void (async() => {
      try {
        await Backuper.removeExpired();
  
        logger.log('[CRON]', 'AUTO_CLEAR_OLD_BACKUPS');
      } catch (err: any) {
        logger.log('[CRON]', 'CRON_RM_BACKUPS', err.message);
      }
    })();
  }, null, true, 'Europe/Moscow')