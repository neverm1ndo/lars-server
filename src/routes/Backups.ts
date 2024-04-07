import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { logger } from '@shared/logger';
import { Response } from 'express';
import { BACKUP } from '@schemas/backup.schema';
import { TreeNode } from '@shared/file-tree/fs.treenode';

import Backuper from '@backuper';
import Workgroup from '@enums/workgroup.enum';
import { CommonErrors } from '@shared/constants';
import { ErrorCode } from '@enums/error.codes.enum';

const { OK, INTERNAL_SERVER_ERROR, CONFLICT } = StatusCodes;

const router = Router();

const LOGGER_PREFIX: string = '[BACKUPS]';

router.get('/list', (req: any, res: any) => {
    logger.log(LOGGER_PREFIX, '[GET]', 'BACKUPS_LIST', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group]);

    void (async () => {
        try {
            const backups = await BACKUP.find({})
                            .sort({ unix: - 1 })
                            .exec();

            return void res.send(backups);
        } catch(err) {
            logger.err(LOGGER_PREFIX, '[GET]', 'BACKUPS_LIST_FAIL', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group]);

            return void res.send(INTERNAL_SERVER_ERROR);
        }
    })();
});

router.get('/backup/:hash', (req: any, res: Response) => {
    logger.log(LOGGER_PREFIX, '[GET]', 'BACKUP_FILE', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], req.params.hash || 'no_hash');

    void (async () => {
        try {
            if (!req.params.hash) {
                logger.err(LOGGER_PREFIX, '[GET]', 'BACKUP_FILE_FAIL', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], req.params.hash || 'no_hash', CONFLICT);
                
                return void res.status(CONFLICT)
                                .send(CommonErrors[ErrorCode.PARAM_MISSING]);
            }
        
            const backupFile = await Backuper.getBackupFile(req.params.hash as string);
            TreeNode.clearCache();
            
            return void res.status(OK).send(backupFile);
        } catch(err: any) {
            logger.err(LOGGER_PREFIX, '[GET]', 'BACKUP_FILE_FAIL', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], req.params.hash, `::${err.message}::`);
            res.status(INTERNAL_SERVER_ERROR)
                .send({ message: err.message });
        }
    })();
});

router.get('/restore/:hash', (req: any, res: Response) => {
  logger.log(LOGGER_PREFIX, '[GET]', 'BACKUP_FILE_RESTORE', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], req.params.hash || 'no_hash');
  
  void (async () => {
        try {
            if (!req.params.hash) { 
                logger.err(LOGGER_PREFIX, '[GET]', 'BACKUP_FILE_RESTORE_FAIL', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], req.params.hash || 'no_hash');
                
                return void res.status(CONFLICT)
                               .send(CommonErrors[ErrorCode.PARAM_MISSING]); 
            }

            await Backuper.restore(req.params.hash as string);

            return void res.status(OK).send([]);

        } catch(err: any) {
            logger.err(LOGGER_PREFIX, '[GET]', 'BACKUP_FILE_RESTORE_FAIL', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], req.params.hash);
            return void res.status(INTERNAL_SERVER_ERROR)
                           .send(err.message);
        }
    })();
});

router.delete('/backup/:hash', (req: any, res: Response) => {
    logger.log(LOGGER_PREFIX, '[DELETE]', 'BACKUP_FILE_DELETE', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], req.params.hash || 'no_hash');
  
    void (async () => {    
        try {
            if (!req.params.hash) { 
                logger.err(LOGGER_PREFIX, '[DELETE]', 'BACKUP_FILE_DELETE_FAIL', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], req.params.hash || 'no_hash', CONFLICT);
                
                return void res.status(CONFLICT)
                            .send(CommonErrors[ErrorCode.PARAM_MISSING]); 
            }
      
            await Backuper.remove(req.params.hash as string);
        
            return void res.status(OK).send([]);
        } catch(message) {
            logger.err(LOGGER_PREFIX, '[DELETE]', 'BACKUP_FILE_DELETE_FAIL', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], req.params.hash);
            
            return void res.status(INTERNAL_SERVER_ERROR)
                           .send(message);
        }
    })();
});

export default router;
