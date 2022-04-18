import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { Logger } from '@shared/Logger';
import { json } from 'body-parser';
import { unlink } from 'fs-extra';
import Backuper from '@backuper';
import { mkdir } from 'fs-extra';

import { corsOpt } from '@shared/constants';

import { io } from '../index';

const router = Router();

const { OK, INTERNAL_SERVER_ERROR, CONFLICT } = StatusCodes;

router.delete('/delete-file', corsOpt, json(), (req: any, res: any) => { // DELETE Removes config file
  if (!req.query.path) { return res.send(CONFLICT); }
  Logger.log('default', 'DELETE │', req.connection.remoteAddress, req.user.user, `role: ${req.user.group_id}`, '-> DELETE_FILE', req.query.path, '[', req.originalUrl, ']');
  Backuper.backup(req.query.path, req.user, 'delete').then(() => {
    return new Promise<void>((res, rej) => {
      return unlink(req.query.path, (err: NodeJS.ErrnoException | null) => {
        return (!!err ? rej(err) : res());
      });
    })
  }).then(() => {
      res.send({status: 'deleted'});
  }).catch((err) => {
      res.sendStatus(INTERNAL_SERVER_ERROR).end(err);
  }).catch((err) => {
    Logger.log('error', 'DELETE_FILE', err.message);
    res.status(INTERNAL_SERVER_ERROR).end('Backuper error: ' + err.message);
  });
});
router.get('/download-file', (req: any, res: any) => { // GET download config file
  if (!req.query.path) { return res.send(CONFLICT); }
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.user, `role: ${req.user.group_id}`, '-> DOWNLOAD_FILE', req.query.path, '[', req.originalUrl, ']');
  res.sendFile(req.query.path);
});

router.post('/mkdir', json(), (req: any, res: any) => { // POST make new dir
  const newDirName: string = 'New Folder';
  if (!req.body.path) return res.send(CONFLICT);
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.user, `role: ${req.user.group_id}`, '-> DOWNLOAD_FILE', req.query.path, '[', req.originalUrl, ']');
  new Promise<void>((res, rej) => {
    mkdir(req.body.name || newDirName, req.body.path, (err) => {
      return (!!err ? rej(err) : res());
    });
  }).then(() => {
    res.send({ status: OK });
  }).catch(err => {
    console.error(err)
    res.send(err);
  });
});

router.get('/update-emitter', (req: any, res: any) => { // GET download config file
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.user, `role: ${req.user.group_id}`, '-> UPDATE_MESSAGE_EMIT');
  io.sockets.emit('update:soft');
  res.sendStatus(OK);
});

export default router;
