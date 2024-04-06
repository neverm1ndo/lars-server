import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { logger } from '@shared/constants';
import { Response } from 'express';
import { BACKUP } from '@schemas/backup.schema';
import { TreeNode } from '@shared/fs.treenode';

import Backuper from '@backuper';
import Workgroup from '@enums/workgroup.enum';

const { OK, INTERNAL_SERVER_ERROR, CONFLICT } = StatusCodes;

const router = Router();

const LOGGER_PREFIX: string = '[BACKUPS]';

router.get('/list', async (req: any, res: any) => {
  logger.log(LOGGER_PREFIX, '[GET]', 'BACKUPS_LIST', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group]);
  
  try {
    const backups = await BACKUP.find({})
      .sort({ unix: - 1 })
      .exec();
    
    return res.send(backups);
  } catch(err) {
    logger.err(LOGGER_PREFIX, '[GET]', 'BACKUPS_LIST_FAIL', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group]);
    return res.send(INTERNAL_SERVER_ERROR);
  }
});

router.get('/backup/:hash', async (req: any, res: any) => {
  logger.log(LOGGER_PREFIX, '[GET]', 'BACKUP_FILE', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], req.params.hash || 'no_hash');
  
  try {
    if (!req.params.hash) {
      logger.err(LOGGER_PREFIX, '[GET]', 'BACKUP_FILE_FAIL', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], req.params.hash || 'no_hash', CONFLICT);
      return res.status(CONFLICT)
                .send('Bad request: required parameters missed');
    }

    const backupFile = await Backuper.getBackupFile(req.params.hash);
    TreeNode.clearCache();
    
    return res.status(OK).send(backupFile);

  } catch(err: any) {
    logger.err(LOGGER_PREFIX, '[GET]', 'BACKUP_FILE_FAIL', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], req.params.hash, `::${err.message}::`);
    res.status(INTERNAL_SERVER_ERROR)
        .send({ message: err.message });
  }
});

router.get('/restore/:hash', async (req: any, res: Response) => {
  logger.log(LOGGER_PREFIX, '[GET]', 'BACKUP_FILE_RESTORE', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], req.params.hash || 'no_hash');
  try {
    if (!req.params.hash) { 
      logger.err(LOGGER_PREFIX, '[GET]', 'BACKUP_FILE_RESTORE_FAIL', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], req.params.hash || 'no_hash');
      
      return res.status(CONFLICT)
                .send('Bad request: required parameters missed'); 
    }

    await Backuper.restore(req.params.hash);

    return res.status(OK).send([]);

  } catch(err: any) {
    logger.err(LOGGER_PREFIX, '[GET]', 'BACKUP_FILE_RESTORE_FAIL', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], req.params.hash);
    res.status(INTERNAL_SERVER_ERROR)
       .send(err.message);
  }
});

router.delete('/backup/:hash', async (req: any, res: Response) => {
  logger.log(LOGGER_PREFIX, '[DELETE]', 'BACKUP_FILE_DELETE', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], req.params.hash || 'no_hash');
  
  try {
    if (!req.params.hash) { 
      logger.err(LOGGER_PREFIX, '[DELETE]', 'BACKUP_FILE_DELETE_FAIL', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], req.params.hash || 'no_hash', CONFLICT);
      return res.status(CONFLICT)
                .send('Bad request: required parameters missed'); 
    }

    await Backuper.remove(req.params.hash);

    return res.status(OK).send([]);
  } catch(message) {
    logger.err(LOGGER_PREFIX, '[DELETE]', 'BACKUP_FILE_DELETE_FAIL', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], req.params.hash);
    res.status(INTERNAL_SERVER_ERROR)
        .send(message);
  }
});

export default router;
