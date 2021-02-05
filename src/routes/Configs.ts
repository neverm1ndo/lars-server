import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { Logger } from '@shared/Logger';
import { Parser } from '@parser';
import { TreeNode } from '@shared/fs.treenode';
import { writeFile, readFile, Stats } from 'fs';
import { promises } from 'fs';
import { json } from 'body-parser';

import { corsOpt, upcfg } from '@shared/constants';
import { getMimeType } from '@shared/functions';

const router = Router();

const parser = new Parser();
const { OK, UNAUTHORIZED, INTERNAL_SERVER_ERROR } = StatusCodes;

router.get('/config-files-tree', corsOpt, (req: any, res: any) => { // GET Files(configs) and directories tree
      if (!req.headers.authorization) return res.sendStatus(UNAUTHORIZED);
      Logger.log('default', 'GET │', req.connection.remoteAddress, '\x1b[94m', req.user.user,`\x1b[91mrole: \x1b[93m${req.user.group_id}`, '\x1b[0m' ,'-> CONFIG_FILES_TREE [', req.originalUrl, ']');
      let root: TreeNode;
      if (req.user.group_id == 10) {
        root = TreeNode.buildTree(process.env.CFG_DEV_PATH!, 'svr_sa');
      } else {
        root = TreeNode.buildTree(process.env.CFG_DEFAULT_PATH!, 'configs');
      }
      res.send(JSON.stringify(root));
    });
    router.get('/config-file', corsOpt, (req: any, res: any) => { // GET single config file
      if (!req.headers.authorization) return res.sendStatus(UNAUTHORIZED);
      Logger.log('default', 'GET │', req.connection.remoteAddress, '\x1b[94m', req.user.user,`\x1b[91mrole: \x1b[93m${req.user.group_id}`, '\x1b[0m' ,'-> CONFIG_FILE', req.query.path, '[', req.originalUrl, ']');
      if (req.query.path) {
        res.set('Content-Type', 'text/plain');
        readFile(decodeURI(req.query.path), (err: NodeJS.ErrnoException | null, buf: Buffer) => {
          if (err) {  res.status(INTERNAL_SERVER_ERROR).send(err) }
          else { res.send(parser.ANSItoUTF8(buf)) };
        });
      }
    });
    router.get('/file-info', corsOpt, (req: any, res: any) => { // GET single config file
      if (!req.headers.authorization) return res.sendStatus(UNAUTHORIZED);
      Logger.log('default', 'GET │', req.connection.remoteAddress, '\x1b[94m', req.user.user,`\x1b[91mrole: \x1b[93m${req.user.group_id}`, '\x1b[0m' ,'-> FILE_INFO', req.query.path, '[', req.originalUrl, ']');
      if (req.query.path) {
        promises.stat(req.query.path).then((stats: Stats) => {
          res.send({size: stats.size, lastm: stats.mtime, mime: getMimeType(req.query.path)});
        }).catch((err: NodeJS.ErrnoException) => {
          res.status(INTERNAL_SERVER_ERROR).end(err);
        })
      }
    });
    router.post('/save-config', corsOpt, json(), (req: any, res: any) => { // POST Write map file
      if (!req.headers.authorization)  { res.sendStatus(UNAUTHORIZED); return ; }
      Logger.log('default', 'POST │', req.connection.remoteAddress, '\x1b[94m', req.user.user,`\x1b[91mrole: \x1b[93m${req.user.group_id}`, '\x1b[0m' ,'-> SAVE_CONF_FILE', req.body.file.path, '[', req.originalUrl, ']');
      writeFile(req.body.file.path, parser.UTF8toANSI(req.body.file.data), (err: NodeJS.ErrnoException | null) => {
        if (err) { res.status(INTERNAL_SERVER_ERROR).send(err) }
        else { res.status(OK).send(JSON.stringify({ res: `Config ${req.body.file.path} successfully saved` }))};
      });
    });
    router.post('/upload-cfg', corsOpt, upcfg.fields([{ name: 'file', maxCount: 10 }]), (req: any, res: any) => { // POST Rewrite changed config(any) file
      if (!req.headers.authorization)  { res.sendStatus(UNAUTHORIZED); return ; }
      Logger.log('default', 'POST │', req.connection.remoteAddress, '\x1b[94m', req.user.user,`\x1b[91mrole: \x1b[93m${req.user.group_id}`, '\x1b[0m' ,'-> UPLOAD_FILE', /**req.body.file.path,**/ '[', req.originalUrl, ']');
      res.sendStatus(OK);
    });


export default router;
