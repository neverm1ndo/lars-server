import StatusCodes from 'http-status-codes';
import { Router } from 'express';

import { TreeNode } from '@shared/fs.treenode';
import { readFile } from 'fs';
import { upmap, logger } from '@shared/constants';
import Workgroup from '@enums/workgroup.enum';
import { NOTFOUND } from 'dns';

const LOGGER_PREFIX = '[MAPS]';

const router = Router();

const { OK, INTERNAL_SERVER_ERROR, CONFLICT } = StatusCodes;

router.get('/maps-files-tree', async (req: any, res: any) => { // GET Files(maps) tree
  
  logger.log(LOGGER_PREFIX, '[GET]', 'MAPS_FS', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number]);
  
  let root = await TreeNode.buildTree(process.env.MAPS_PATH!, 'maps');
  
  if (!root) {
    logger.err(LOGGER_PREFIX, '[GET]', 'MAPS_FS_BUILD_FAIL', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number]);
    return res.send(INTERNAL_SERVER_ERROR);
  }
  res.send(root);
});

router.get('/map-file', (req: any, res: any) => { // GET Files(maps) tree
  
  if (!req.query.path) { 
    return res.send(CONFLICT); 
  };
  
  logger.log(LOGGER_PREFIX, '[GET]', 'MAP_FILE', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number], req.query.path);
  
  const filePathURI: string = decodeURI(req.query.path);

  readFile(filePathURI, (err: NodeJS.ErrnoException | null, data: any) => {
    if (err) {
      logger.log(LOGGER_PREFIX, '[GET]', 'MAP_FILE_FAIL', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number], req.query.path, NOTFOUND);
      return res.status(NOTFOUND)
                .send(err.message);
    }
    res.set('Content-Type', 'text/xml')
       .send(data);
  });

});

router.post('/upload-map', upmap.fields([{ name: 'file', maxCount: 10 }]), (req: any, res: any) => { // POST Rewrite changed config(any) file
  logger.log(LOGGER_PREFIX, '[POST]', 'MAP_FILE_UPLOAD', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number]);
  res.sendStatus(OK);
});

export default router;
