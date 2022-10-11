import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { Logger } from '@shared/Logger';
import { json } from 'body-parser';
import { unlink } from 'fs-extra';
import Backuper, { BackupAction } from '@backuper';
import { mkdir, rmdir, move } from 'fs-extra';

import { io } from '../index';

const router = Router();

const { OK, INTERNAL_SERVER_ERROR, CONFLICT } = StatusCodes;

router.delete('/delete-file', json(), (req: any, res: any) => { // DELETE Removes config file
  if (!req.query.path) { 
    return res.send(CONFLICT); 
  }
  
  Logger.log('default', 'DELETE │', req.connection.remoteAddress, req.user.username, `role: ${req.user.main_group}`, '-> DELETE_FILE', req.query.path, '[', req.originalUrl, ']');
  
  Backuper.backup(req.query.path, req.user, BackupAction.DELETE)
          .then(() => new Promise<void>(
            (res, rej) => unlink(
              req.query.path, 
              (err: NodeJS.ErrnoException | null) => (!!err ? rej(err) : res())))
          )
          .then(() => {
            res.send({ status: 'deleted' });
          })
          .catch((err) => {
            res.sendStatus(INTERNAL_SERVER_ERROR)
               .end(err);
          })
          .catch((err) => {
            Logger.log('error', 'DELETE_FILE', err.message);
            res.status(INTERNAL_SERVER_ERROR)
               .end('Backuper error: ' + err.message);
          });
});
router.get('/download-file', (req: any, res: any) => { // GET download config file
  
  if (!req.query.path) { 
    return res.send(CONFLICT); 
  }
  
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.username, `role: ${req.user.main_group}`, '-> DOWNLOAD_FILE', req.query.path, '[', req.originalUrl, ']');
  
  res.sendFile(req.query.path);
});

router.post('/mkdir', json(), (req: any, res: any) => { // POST make new dir
  if (!req.body.path) return res.send(CONFLICT);
  if (req.body.path == '/') return res.send(CONFLICT);
  
  Logger.log('default', 'POST │', req.connection.remoteAddress, req.user.username, `role: ${req.user.main_group}`, '-> MKDIR', req.body.path, '[', req.originalUrl, ']');
  
  new Promise<void>((res, rej) => {
    mkdir(decodeURI(req.body.path), (err) => (!!err ? rej(err) : res()));
  })
  .then(() => {
    res.send({ 
      status: OK, 
      path: decodeURI(req.body.path)
    });
  })
  .catch(err => {
    Logger.log('error', err.message);
    res.status(INTERNAL_SERVER_ERROR)
       .send(err);
  });
});

router.delete('/rmdir', (req: any, res: any) => { // DELETE delete dir
  if (!req.query.path) return res.send(CONFLICT);
  
  const dirPath: string = decodeURI(req.query.path);
  if ([process.env.CFG_DEV_PATH, process.env.CFG_DEFAULT_PATH, process.env.MAPS_PATH].includes(dirPath)) return res.send(CONFLICT);
  
  Logger.log('default', 'POST │', req.connection.remoteAddress, req.user.username, `role: ${req.user.main_group}`, '-> RMDIR', req.query.path, '[', req.originalUrl, ']');
  
  new Promise<void>((res, rej) => {
    rmdir(dirPath, (err) => (!!err ? rej(err) : res()));
  })
  .then(() => {
    res.send({ status: OK });
  })
  .catch(err => {
    Logger.log('error', err.message);
    res.status(INTERNAL_SERVER_ERROR)
       .send(err);
  });
});

router.patch('/mvdir', json() ,(req: any, res: any) => { // PATCH move dir
  if (!req.body.path && !req.body.dest) return res.send(CONFLICT);
  
  const dirPath: string = decodeURI(req.body.path);
  const dirDestPath: string = decodeURI(req.body.dest);
  
  if ([process.env.CFG_DEV_PATH, process.env.CFG_DEFAULT_PATH, process.env.MAPS_PATH].includes(dirPath)) return res.send(CONFLICT);
  
  Logger.log('default', 'POST │', req.connection.remoteAddress, req.user.username, `role: ${req.user.main_group}`, '-> RMDIR', req.body.path, req.body.dest, '[', req.originalUrl, ']');
  
  new Promise<void>((res, rej) => {
    move(dirPath, dirDestPath, (err) => !!err ? rej(err) : res());
  })
  .then(() => {
    res.send({ status: OK });
  })
  .catch(err => {
    console.error(err);
    res.status(INTERNAL_SERVER_ERROR).send(err);
  });
});

router.get('/update-emitter', (req: any, res: any) => { // GET download config file
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.username, `role: ${req.user.main_group}`, '-> UPDATE_MESSAGE_EMIT');
  io.sockets.emit('update:soft');
  res.sendStatus(OK);
});

export default router;
