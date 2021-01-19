import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { Logger } from '@shared/Logger';
import { Parser } from '@parser';
import { FSTreeNode } from '@shared/fs.treenode';
import cors from 'cors';
import { writeFile, readFile } from 'fs';
import { json } from 'body-parser';

import { CORSoptions } from '@shared/constants';

const router = Router();

const parser = new Parser();
const { OK, UNAUTHORIZED, INTERNAL_SERVER_ERROR } = StatusCodes;

router.get('/api/config-files-tree', cors(CORSoptions), (req: any, res: any) => { // GET Files(configs) and directories tree
      if (!req.headers.authorization) return res.sendStatus(UNAUTHORIZED);
      Logger.log('default', 'GET │', req.connection.remoteAddress, '\x1b[94m', req.user.user,`\x1b[91mrole: \x1b[93m${req.user.group_id}`, '\x1b[0m' ,'-> CONFIG_FILES_TREE [', req.originalUrl, ']');
      let root = FSTreeNode.buildTree(process.env.CFG_PATH!, 'configs');
      res.send(JSON.stringify(root));
    });
    router.get('/api/config-file', cors(CORSoptions), (req: any, res: any) => { // GET single config file
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
    router.post('/api/save-config', cors(CORSoptions), json(), (req: any, res: any) => { // POST Write map file
      if (!req.headers.authorization)  { res.sendStatus(UNAUTHORIZED); return ; }
      Logger.log('default', 'POST │', req.connection.remoteAddress, '\x1b[94m', req.user.user,`\x1b[91mrole: \x1b[93m${req.user.group_id}`, '\x1b[0m' ,'-> SAVE_CONF_FILE', req.body.file.path, '[', req.originalUrl, ']');
      writeFile(req.body.file.path, parser.UTF8toANSI(req.body.file.data), (err: NodeJS.ErrnoException | null) => {
        if (err) { res.status(INTERNAL_SERVER_ERROR).send(err) }
        else { res.status(OK).send(JSON.stringify({ res: `Config ${req.body.file.path} successfully saved` }))};
      });
    });

export default router;
