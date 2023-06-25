import StatusCodes from 'http-status-codes';
import { Router } from 'express';

import { json } from 'body-parser';
import Backuper, { BackupAction } from '@backuper';
import { mkdir, rmdir, move } from 'fs-extra';
import { unlink } from 'fs/promises';

import { io } from '../index';
import path from 'path'
import { logger } from '@shared/constants';
import Workgroup from '@enums/workgroup.enum';
import { TreeNode } from '@shared/fs.treenode';

const LOGGER_PREFIX = '[UTILS]';

const router = Router();

const { OK, INTERNAL_SERVER_ERROR, CONFLICT, NOT_FOUND } = StatusCodes;

router.delete('/delete-file', json(), (req: any, res: any) => { // DELETE Removes config file
  if (!req.query.path) { 
    return res.send(CONFLICT); 
  }
  
  logger.log(LOGGER_PREFIX, '[DELETE]', 'FILE', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number], req.query.path);
  
  Backuper.backup(req.query.path, req.user, BackupAction.DELETE)
          .then(() => unlink(req.query.path))
                      .then(() => {
                        TreeNode.clearCache();
                        res.send({ status: 'deleted' });
                      })
                      .catch((err) => {
                        res.status(NOT_FOUND).send(err.message);
                      })
          .catch((err) => {
            logger.err(LOGGER_PREFIX, '[DELETE]', 'FILE', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number], req.query.path);
            res.status(INTERNAL_SERVER_ERROR)
               .end('Backuper error: ' + err.message);
          });
});
router.get('/download-file', (req: any, res: any) => { // GET download config file
  
  if (!req.query.path) { 
    return res.send(CONFLICT); 
  }

  logger.log(LOGGER_PREFIX, '[GET]', 'FILE_DOWNLOAD', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number], req.query.path);
  
  res.sendFile(path.normalize(req.query.path));
});

router.post('/mkdir', json(), (req: any, res: any) => { // POST make new dir
  if (!req.body.path) return res.send(CONFLICT);
  if (req.body.path == '/') return res.send(CONFLICT);
  
  logger.log(LOGGER_PREFIX, '[POST]', 'MKDIR', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number], req.body.path);
  
  new Promise<void>((res, rej) => {
    mkdir(decodeURI(req.body.path), (err) => (!!err ? rej(err) : res()));
  })
  .then(() => {
    TreeNode.clearCache();
    res.send({ 
      status: OK, 
      path: decodeURI(req.body.path)
    });
  })
  .catch(err => {
    logger.err(LOGGER_PREFIX, '[POST]', 'MKDIR', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number], req.body.path, err.message);
    res.status(INTERNAL_SERVER_ERROR)
       .send(err);
  });
});

router.delete('/rmdir', (req: any, res: any) => { // DELETE delete dir
  if (!req.query.path) return res.send(CONFLICT);
  
  const dirPath: string = decodeURI(req.query.path);
  if ([process.env.CFG_DEV_PATH, process.env.CFG_DEFAULT_PATH, process.env.MAPS_PATH].includes(dirPath)) return res.send(CONFLICT);
  
  logger.log(LOGGER_PREFIX, '[POST]', 'RMDIR', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number], req.query.path);
  
  new Promise<void>((res, rej) => {
    rmdir(dirPath, (err) => (!!err ? rej(err) : res()));
  })
  .then(() => {
    TreeNode.clearCache();
    res.send({ status: OK });
  })
  .catch(err => {
    logger.log(LOGGER_PREFIX, '[POST]', 'RMDIR', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number], req.query.path, err.message);;
    res.status(INTERNAL_SERVER_ERROR)
       .send(err);
  });
});

router.patch('/mvdir', json() ,(req: any, res: any) => { // PATCH move dir
  if (!req.body.path && !req.body.dest) return res.send(CONFLICT);
  
  const dirPath: string = decodeURI(req.body.path);
  const dirDestPath: string = decodeURI(req.body.dest);
  
  if ([process.env.CFG_DEV_PATH, process.env.CFG_DEFAULT_PATH, process.env.MAPS_PATH].includes(dirPath)) return res.send(CONFLICT);
  
  logger.log(LOGGER_PREFIX, '[POST]', 'MVDIR', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number], dirPath, '::', dirDestPath);
  
  new Promise<void>((res, rej) => {
    move(dirPath, dirDestPath, (err) => !!err ? rej(err) : res());
  })
  .then(() => {
    TreeNode.clearCache();
    res.send({ status: OK });
  })
  .catch(err => {
    logger.log(LOGGER_PREFIX, '[POST]', 'MVDIR', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number], dirPath, '::', dirDestPath);
    res.status(INTERNAL_SERVER_ERROR).send(err);
  });
});

router.get('/update-emitter', (req: any, res: any) => { // GET download config file
  logger.log(LOGGER_PREFIX, '[GET]', 'SOFT_UPDATE_EMIT', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number]);
  io.sockets.emit('update:soft');
  res.sendStatus(OK);
});

export default router;
