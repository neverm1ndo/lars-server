import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { Logger } from '@shared/Logger';
import { TreeNode } from '@shared/fs.treenode';
import { readFile } from 'fs';
import { corsOpt, upmap } from '@shared/constants';

const router = Router();

const { OK, INTERNAL_SERVER_ERROR, CONFLICT } = StatusCodes;

router.get('/maps-files-tree', corsOpt, (req: any, res: any) => { // GET Files(maps) tree
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.user,`role: ${req.user.group_id}`, '-> MAPS_FILES_TREE [', req.originalUrl, ']');
  let root = TreeNode.buildTree(process.env.MAPS_PATH!, 'maps');
  if (!root) return res.send(INTERNAL_SERVER_ERROR);
  res.send(JSON.stringify(root));
});
router.get('/map-file', corsOpt, (req: any, res: any) => { // GET Files(maps) tree
  if (!req.query.path) { return res.send(CONFLICT) };
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.user,`role: ${req.user.group_id}`, '-> MAP [', req.originalUrl, ']');
  res.set('Content-Type', 'text/xml');
  readFile(decodeURI(req.query.path), (err: NodeJS.ErrnoException | null, data: any) => {
    if (err) {  res.status(INTERNAL_SERVER_ERROR).send(err) }
    else {
      res.send(data);
    };
  });
});
router.post('/upload-map', corsOpt, upmap.fields([{ name: 'file', maxCount: 10 }]), (req: any, res: any) => { // POST Rewrite changed config(any) file
  Logger.log('default', 'POST │', req.connection.remoteAddress, req.user.user,`role: ${req.user.group_id}`, '-> UPLOAD_FILE', /**req.body.file.path,**/ '[', req.originalUrl, ']');
  res.sendStatus(OK);
});
export default router;
