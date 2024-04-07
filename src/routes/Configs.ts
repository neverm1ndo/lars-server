import StatusCodes from 'http-status-codes';
import { Router, Response, Request } from 'express';

import { TreeNode } from '@shared/file-tree/fs.treenode';
import fs, { Stats } from 'fs';
import Workgroup from '@enums/workgroup.enum';

import { upcfg, upfile } from '@shared/storage/';
import { ANSItoUTF8 } from '@shared/functions';
import { getMimeType } from '@shared/mime';
import { logger } from '@shared/logger';

const LOGGER_PREFIX = '[CONFIGS]';

const router = Router();

const { OK, INTERNAL_SERVER_ERROR, CONFLICT, NOT_FOUND } = StatusCodes;
const { DEV } = Workgroup;

/**
 *  GET Files(configs) and directories tree
 */ 
router.get('/config-files-tree', (req: Request, res: Response) => {
  
    logger.log(LOGGER_PREFIX, '[GET]', 'CONFIGS_FS', `(${req.socket.remoteAddress})`, req.user?.username);

    let root: TreeNode;

    void (async () => {
        if (req.user?.main_group == DEV) {
            root = await TreeNode.buildTree(process.env.CFG_DEV_PATH!, 'svr_sa');
        } else {
            root = await TreeNode.buildTree(process.env.CFG_DEFAULT_PATH!, 'configs');
        }
    
        if (!root) {
            logger.err(LOGGER_PREFIX, '[GET]', 'CONFIGS_FS_BUILD_FAIL', `(${req.socket.remoteAddress})`, req.user?.username);
            
            return void res.status(INTERNAL_SERVER_ERROR)
                           .send('Cant read file tree');
        }
    
        res.send(root);
    })();
});

/**
 * GET single config file
 */
router.get('/config-file', (req: Request, res: Response) => {
  if (!req.query.path) return void res.status(CONFLICT);
  
  logger.log(LOGGER_PREFIX, '[GET]', 'CONFIG_FILE', `(${req.socket.remoteAddress})`, req.user?.username, req.query.path);
  
  const filePath = req.query.path as string;

  fs.promises.stat(filePath)
          .then(() => {
            fs.readFile(decodeURI(filePath), (err: NodeJS.ErrnoException | null, buffer: Buffer) => {
                if (err) { 
                    logger.err(LOGGER_PREFIX, '[GET]', 'CONFIG_FILE_READ_FILE_FAIL', `(${req.socket.remoteAddress})`, req.user?.username, req.query.path);

                    return res.status(NOT_FOUND)
                                .send(err.message); 
                }

                res.send(ANSItoUTF8(buffer));
            });
          })
          .catch((err: NodeJS.ErrnoException) => {
            logger.err(LOGGER_PREFIX, '[GET]', 'CONFIG_FILE_FAIL', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user!.main_group], req.query.path);

            res.status(INTERNAL_SERVER_ERROR)
               .send(err.message);
          });
});

/**
 * GET stat of file  
 */
router.get('/file-info', (req: Request, res: Response) => {
    if (!req.query.path) { 
        return void res.status(CONFLICT)
                        .send('Empty path param');
    }

    logger.log(LOGGER_PREFIX, '[GET]', 'CONFIG_FILE_STAT', `(${req.socket.remoteAddress})`, req.user?.username, req.query.path);
  
    const filePath = req.query.path as string;

    fs.promises.stat(filePath)
                .then((stats: Stats) => {
                    res.send({ 
                        size: stats.size, 
                        lastm: stats.mtime, 
                        mime: getMimeType(filePath)
                    });
                })
                .catch((err: NodeJS.ErrnoException) => {
                    logger.err(LOGGER_PREFIX, '[GET]', 'CONFIG_FILE_STAT_FAIL', `(${req.socket.remoteAddress})`, req.user?.username, req.query.path, `::${err.message}::`);
                    
                    res.status(NOT_FOUND)
                       .send(err.message);
                });
});

router.post(
    '/save-file',
    upcfg.fields([{ name: 'file', maxCount: 1 }]),
    (req: Request, res: Response) => {
        logger.log(LOGGER_PREFIX, '[POST]', 'CONFIG_FILE_SAVE', `(${req.socket.remoteAddress})`, req.user?.username);
        
        TreeNode.clearCache();
        res.sendStatus(OK);
    }
);

/**
 * POST Rewrite changed config(any) file
 */
router.post('/upload-file', upfile.fields([{ name: 'file', maxCount: 100 }]), (req: Request, res: Response) => {
    logger.log(LOGGER_PREFIX, '[POST]', 'CONFIG_FILE_UPLOAD', `(${req.socket.remoteAddress})`, req.user?.username);
    
    TreeNode.clearCache();
    res.sendStatus(OK);
});

export default router;
