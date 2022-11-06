import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { Logger } from '@shared/Logger';
import { TreeNode } from '@shared/fs.treenode';
import { readFile } from 'fs';
import { upmap } from '@shared/constants';

const router = Router();

const { OK, INTERNAL_SERVER_ERROR, CONFLICT } = StatusCodes;

router.get('/maps-files-tree', async (req: any, res: any) => { // GET Files(maps) tree
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.username,`role: ${req.user.main_group}`, '-> MAPS_FILES_TREE [', req.originalUrl, ']');
  let root = await TreeNode.buildTree(process.env.MAPS_PATH!, 'maps');
  if (!root) return res.send(INTERNAL_SERVER_ERROR);
  res.send(JSON.stringify(root));
});

router.get('/map-file', (req: any, res: any) => { // GET Files(maps) tree
  if (!req.query.path) { return res.send(CONFLICT) };
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.username,`role: ${req.user.main_group}`, '-> MAP [', req.originalUrl, ']');
  readFile(decodeURI(req.query.path), (err: NodeJS.ErrnoException | null, data: any) => {
    if (err) { res.status(INTERNAL_SERVER_ERROR).send(err) }
    else {
      res.set('Content-Type', 'text/xml').send(data);
    };
  });
});

router.post('/upload-map', upmap.fields([{ name: 'file', maxCount: 10 }]), (req: any, res: any) => { // POST Rewrite changed config(any) file
  Logger.log('default', 'POST │', req.connection.remoteAddress, req.user.username,`role: ${req.user.main_group}`, '-> UPLOAD_FILE', /**req.body.file.path,**/ '[', req.originalUrl, ']');
  res.sendStatus(OK);
});

export default router;
