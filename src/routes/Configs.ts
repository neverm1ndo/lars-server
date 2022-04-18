import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { Logger } from '@shared/Logger';
import { Parser } from '@parser';
import { TreeNode } from '@shared/fs.treenode';
import { writeFile, readFile, Stats } from 'fs';
import { promises } from 'fs';
import { json } from 'express';
import Workgroup from '@enums/workgroup.enum';

import Backuper from '@backuper';

import { corsOpt, upcfg } from '@shared/constants';
import { getMimeType } from '@shared/functions';


const router = Router();

const parser = new Parser();
const { OK, INTERNAL_SERVER_ERROR, CONFLICT, NOT_FOUND } = StatusCodes;
const { DEV } = Workgroup;

router.get('/config-files-tree', corsOpt, (req: any, res: any) => { // GET Files(configs) and directories tree
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.user,`role: ${req.user.group_id}`, '-> CONFIG_FILES_TREE [', req.originalUrl, ']');
  let root: TreeNode;

  if (req.user.group_id == DEV) root = TreeNode.buildTree(process.env.CFG_DEV_PATH!, 'svr_sa');
  else root = TreeNode.buildTree(process.env.CFG_DEFAULT_PATH!, 'configs');

  if (!root) res.status(INTERNAL_SERVER_ERROR).send({ message: 'Cant read file tree' });
  res.send(JSON.stringify(root));
});
router.get('/config-file', corsOpt, (req: any, res: any) => { // GET single config file
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.user,`role: ${req.user.group_id}`, '-> CONFIG_FILE', req.query.path, '[', req.originalUrl, ']');
  if (!req.query.path) return res.status(CONFLICT);
  promises.stat(req.query.path).then(() => {
    readFile(decodeURI(req.query.path), (err: NodeJS.ErrnoException | null, buf: Buffer) => {
      if (err) { res.status(NOT_FOUND).send(err); }
      else { res.send(parser.ANSItoUTF8(buf)); };
    });
  }).catch((err: NodeJS.ErrnoException) => {
    res.status(INTERNAL_SERVER_ERROR).send({ message: err.message });
  });
});
router.get('/file-info', corsOpt, (req: any, res: any) => { // GET stat of file
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.user,`role: ${req.user.group_id}`, '-> FILE_INFO', req.query.path, '[', req.originalUrl, ']');
  if (!req.query.path) { return res.status(CONFLICT).send({ message: 'Empty path param'})}
  promises.stat(req.query.path).then((stats: Stats) => {
    res.send({size: stats.size, lastm: stats.mtime, mime: getMimeType(req.query.path)});
  }).catch((err: NodeJS.ErrnoException) => {
    res.status(NOT_FOUND).send({ message: err.message });
  });
});
router.post('/save-config', corsOpt, json({ limit: '5mb' }), (req: any, res: any) => { // POST Write map file
  Logger.log('default', 'POST │', req.connection.remoteAddress, req.user.user,`role: ${req.user.group_id}`, '-> SAVE_CONF_FILE', req.body.file.path, '[', req.originalUrl, ']');
  Backuper.backup(req.body.file.path, req.user, 'change').then(() => {
    writeFile(req.body.file.path, parser.UTF8toANSI(req.body.file.data), (err: NodeJS.ErrnoException | null) => {
      if (err) { res.status(INTERNAL_SERVER_ERROR).send(err) }
      else { res.status(OK).send(JSON.stringify({ res: `Config ${req.body.file.path} successfully saved` }))};
    });
  }).catch((err) => {
    Logger.log('error', 'SAVE_CONF_FILE', err.message);
    res.status(INTERNAL_SERVER_ERROR).send('Backuper error: ' + err.message);
  });
});
router.post('/upload-cfg', corsOpt, upcfg.fields([{ name: 'file', maxCount: 10 }]), (req: any, res: any) => { // POST Rewrite changed config(any) file
  Logger.log('default', 'POST │', req.connection.remoteAddress, req.user.user,`role: ${req.user.group_id}`, '-> UPLOAD_FILE', '[', req.originalUrl, ']');
  res.sendStatus(OK);
});

export default router;
