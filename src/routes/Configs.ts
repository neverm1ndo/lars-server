import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { Logger } from '@shared/Logger';
import { TreeNode } from '@shared/fs.treenode';
import { readFile, Stats, promises } from 'fs';
import Workgroup from '@enums/workgroup.enum';

import { upcfg, upfile } from '@shared/constants';
import { getMimeType, ANSItoUTF8 } from '@shared/functions';


const router = Router();

const { OK, INTERNAL_SERVER_ERROR, CONFLICT, NOT_FOUND } = StatusCodes;
const { DEV } = Workgroup;

router.get('/config-files-tree', async (req: any, res: any) => { // GET Files(configs) and directories tree
  
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.username,`role: ${req.user.main_group}`, '-> CONFIG_FILES_TREE [', req.originalUrl, ']');
  let root: TreeNode;
  
  if (req.user.main_group == DEV) 
    root = await TreeNode.buildTree(process.env.CFG_DEV_PATH!, 'svr_sa');
  else 
    root = await TreeNode.buildTree(process.env.CFG_DEFAULT_PATH!, 'configs');

  if (!root) res.status(INTERNAL_SERVER_ERROR).send('Cant read file tree');
  
  res.send(root);
});

router.get('/config-file', (req: any, res: any) => { // GET single config file
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.username,`role: ${req.user.main_group}`, '-> CONFIG_FILE', req.query.path, '[', req.originalUrl, ']');
  if (!req.query.path) return res.status(CONFLICT);
  promises.stat(req.query.path)
          .then(() => {
            readFile(decodeURI(req.query.path), (err: NodeJS.ErrnoException | null, buffer: Buffer) => {
              if (err) { 
                return res.status(NOT_FOUND)
                          .send(err.message); 
              }
              res.send(ANSItoUTF8(buffer));
            });
          })
          .catch((err: NodeJS.ErrnoException) => {
            console.log(err.message);
            res.status(INTERNAL_SERVER_ERROR)
               .send(err.message);
          });
});

router.get('/file-info', (req: any, res: any) => { // GET stat of file
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.username,`role: ${req.user.main_group}`, '-> FILE_INFO', req.query.path);
  if (!req.query.path) { 
    return res.status(CONFLICT)
              .send('Empty path param')
  };
  promises.stat(req.query.path)
          .then((stats: Stats) => {
            res.send({ 
              size: stats.size, 
              lastm: stats.mtime, 
              mime: getMimeType(req.query.path)
            });
          })
          .catch((err: NodeJS.ErrnoException) => {
            res.status(NOT_FOUND)
               .send(err.message);
          });
});

router.post('/save-config', upcfg.fields([{ name: 'file', maxCount: 1 }]), (req: any, res: any) => {
  Logger.log('default', 'POST │', req.connection.remoteAddress, req.user.username,`role: ${req.user.main_group}`, '-> SAVE_CONF_FILE');
  res.sendStatus(OK);
});

router.post('/upload-file', upfile.fields([{ name: 'file', maxCount: 10 }]), (req: any, res: any) => { // POST Rewrite changed config(any) file
  Logger.log('default', 'POST │', req.connection.remoteAddress, req.user.username,`role: ${req.user.main_group}`, '-> UPLOAD_FILE');
  res.sendStatus(OK);
});

export default router;
