import StatusCodes from 'http-status-codes';
import { Router } from 'express';

import { TreeNode } from '@shared/fs.treenode';
import fs, { Stats } from 'fs';
import Workgroup from '@enums/workgroup.enum';

import { upcfg, upfile, logger } from '@shared/constants';
import { getMimeType, ANSItoUTF8 } from '@shared/functions';

const LOGGER_PREFIX = '[CONFIGS]';

const router = Router();

const { OK, INTERNAL_SERVER_ERROR, CONFLICT, NOT_FOUND } = StatusCodes;
const { DEV } = Workgroup;

router.get('/config-files-tree', async (req: any, res: any) => { // GET Files(configs) and directories tree
  
  logger.log(LOGGER_PREFIX, '[GET]', 'CONFIGS_FS', `(${req.socket.remoteAddress})`, req.user.username, Workgroup[req.user!.main_group]);
  
  let root: TreeNode;
  
  if (req.user.main_group == DEV) {
    root = await TreeNode.buildTree(process.env.CFG_DEV_PATH!, 'svr_sa');
  } else {
    root = await TreeNode.buildTree(process.env.CFG_DEFAULT_PATH!, 'configs');
  }
  
  if (!root) {
    logger.err(LOGGER_PREFIX, '[GET]', 'CONFIGS_FS_BUILD_FAIL', `(${req.socket.remoteAddress})`, req.user.username, Workgroup[req.user!.main_group]);
    return res.status(INTERNAL_SERVER_ERROR).send('Cant read file tree');
  }
  
  res.send(root);
});

router.get('/config-file', (req: any, res: any) => { // GET single config file
  if (!req.query.path) return res.status(CONFLICT);
  
  logger.log(LOGGER_PREFIX, '[GET]', 'CONFIG_FILE', `(${req.socket.remoteAddress})`, req.user.username, Workgroup[req.user!.main_group], req.query.path);
  
  fs.promises.stat(req.query.path)
          .then(() => {
            fs.readFile(decodeURI(req.query.path), (err: NodeJS.ErrnoException | null, buffer: Buffer) => {
              if (err) { 
                logger.err(LOGGER_PREFIX, '[GET]', 'CONFIG_FILE_READ_FILE_FAIL', `(${req.socket.remoteAddress})`, req.user.username, Workgroup[req.user!.main_group], req.query.path);
                return res.status(NOT_FOUND)
                          .send(err.message); 
              }
              res.send(ANSItoUTF8(buffer));
            });
          })
          .catch((err: NodeJS.ErrnoException) => {
            logger.err(LOGGER_PREFIX, '[GET]', 'CONFIG_FILE_FAIL', `(${req.socket.remoteAddress})`, req.user.username, Workgroup[req.user!.main_group], req.query.path);
            res.status(INTERNAL_SERVER_ERROR)
               .send(err.message);
          });
        });

router.get('/file-info', (req: any, res: any) => { // GET stat of file  
  if (!req.query.path) { 
    return res.status(CONFLICT)
              .send('Empty path param');
  };
  
  logger.log(LOGGER_PREFIX, '[GET]', 'CONFIG_FILE_STAT', `(${req.socket.remoteAddress})`, req.user.username, Workgroup[req.user!.main_group], req.query.path);
  
  fs.promises.stat(req.query.path)
             .then((stats: Stats) => {
                res.send({ 
                  size: stats.size, 
                  lastm: stats.mtime, 
                  mime: getMimeType(req.query.path)
                });
              })
             .catch((err: NodeJS.ErrnoException) => {
                logger.err(LOGGER_PREFIX, '[GET]', 'CONFIG_FILE_STAT_FAIL', `(${req.socket.remoteAddress})`, req.user.username, Workgroup[req.user!.main_group], req.query.path, `::${err.message}::`);
                
                res.status(NOT_FOUND)
                   .send(err.message);
              });
});

router.post('/save-config', upcfg.fields([{ name: 'file', maxCount: 1 }]), (req: any, res: any) => {
  logger.log(LOGGER_PREFIX, '[POST]', 'CONFIG_FILE_SAVE', `(${req.socket.remoteAddress})`, req.user.username, Workgroup[req.user!.main_group]);
  res.sendStatus(OK);
});

router.post('/upload-file', upfile.fields([{ name: 'file', maxCount: 10 }]), (req: any, res: any) => { // POST Rewrite changed config(any) file
  logger.log(LOGGER_PREFIX, '[POST]', 'CONFIG_FILE_UPLOAD', `(${req.socket.remoteAddress})`, req.user.username, Workgroup[req.user!.main_group]);
  res.sendStatus(OK);
});

export default router;
