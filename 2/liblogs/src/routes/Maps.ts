import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { Logger } from '@shared/Logger';
import { TreeNode } from '@shared/fs.treenode';
import cors from 'cors';
import { readFile } from 'fs';

import { CORSoptions, upcfg, upmap } from '@shared/constants';

const router = Router();

const { OK, UNAUTHORIZED, INTERNAL_SERVER_ERROR } = StatusCodes;

router.get('/api/maps-files-tree', cors(CORSoptions), (req: any, res: any) => { // GET Files(maps) tree
  if (!req.headers.authorization) return res.sendStatus(UNAUTHORIZED);
  Logger.log('default', 'GET │', req.connection.remoteAddress, '\x1b[94m', req.user.user,`\x1b[91mrole: \x1b[93m${req.user.group_id}`, '\x1b[0m' ,'-> MAPS_FILES_TREE [', req.originalUrl, ']');
  let root = TreeNode.buildTree(process.env.MAPS_PATH!, 'maps');
  res.send(JSON.stringify(root));
});
router.get('/api/map-file', cors(CORSoptions), (req: any, res: any) => { // GET Files(maps) tree
  if (!req.headers.authorization) return res.sendStatus(UNAUTHORIZED);
    Logger.log('default', 'GET │', req.connection.remoteAddress, '\x1b[94m', req.user.user,`\x1b[91mrole: \x1b[93m${req.user.group_id}`, '\x1b[0m' ,'-> MAP [', req.originalUrl, ']');
    if (req.query.path) {
    res.set('Content-Type', 'text/xml');
    readFile(decodeURI(req.query.path), (err: NodeJS.ErrnoException | null, data: any) => {
      if (err) {  res.status(INTERNAL_SERVER_ERROR).send(err) }
      else {
        res.send(data);
      };
    });
  }
});
router.post('/api/upload-map', cors(CORSoptions), upmap.fields([{ name: 'file', maxCount: 10 }]), (req: any, res: any) => { // POST Rewrite changed config(any) file
  if (!req.headers.authorization)  { res.sendStatus(UNAUTHORIZED); return ; }
  Logger.log('default', 'POST │', req.connection.remoteAddress, '\x1b[94m', req.user.user,`\x1b[91mrole: \x1b[93m${req.user.group_id}`, '\x1b[0m' ,'-> UPLOAD_FILE', /**req.body.file.path,**/ '[', req.originalUrl, ']');
  res.sendStatus(OK);
});
router.post('/api/upload-cfg', cors(CORSoptions), upcfg.fields([{ name: 'file', maxCount: 10 }]), (req: any, res: any) => { // POST Rewrite changed config(any) file
  if (!req.headers.authorization)  { res.sendStatus(UNAUTHORIZED); return ; }
  Logger.log('default', 'POST │', req.connection.remoteAddress, '\x1b[94m', req.user.user,`\x1b[91mrole: \x1b[93m${req.user.group_id}`, '\x1b[0m' ,'-> UPLOAD_FILE', /**req.body.file.path,**/ '[', req.originalUrl, ']');
  res.sendStatus(OK);
});

export default router;
