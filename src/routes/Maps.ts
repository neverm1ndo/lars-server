import StatusCodes from 'http-status-codes';
import { Request, Response, Router } from 'express';

import { TreeNode } from '@shared/file-tree/fs.treenode';
import { readFile } from 'fs';
import { upmap } from '@shared/storage';
import Workgroup from '@enums/workgroup.enum';
import { logger } from '@shared/logger';

const LOGGER_PREFIX = '[MAPS]';

const router = Router();

const { OK, INTERNAL_SERVER_ERROR, CONFLICT, NOT_FOUND } = StatusCodes;

/**
 * GET Files tree /maps
 */
router.get('/maps-files-tree', (req: Request, res: Response) => {
    logger.log(LOGGER_PREFIX, '[GET]', 'MAPS_FS', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number]);

    void (async() => {
        try {
            const root = await TreeNode.buildTree(process.env.MAPS_PATH!, 'maps');

            if (!root) {
                logger.err(LOGGER_PREFIX, '[GET]', 'MAPS_FS_BUILD_FAIL', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number]);

                throw INTERNAL_SERVER_ERROR;
            }

            return void res.send(root);
        } catch (err) {
            return void res.sendStatus(err as number);
        }
    })();
});

/**
 * GET specific map file
 */
router.get('/map-file', (req: Request, res: Response) => {
    if (!req.query.path) {
        throw CONFLICT;
    }

    logger.log(LOGGER_PREFIX, '[GET]', 'MAP_FILE', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number], req.query.path);

    const filePathURI: string = decodeURI(req.query.path as string);

    readFile(filePathURI, (err: NodeJS.ErrnoException | null, data: Buffer) => {
        if (err) {
            logger.log(LOGGER_PREFIX, '[GET]', 'MAP_FILE_FAIL', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number], req.query.path, NOT_FOUND);
            return res.status(NOT_FOUND)
                        .send(err.message);
        }

        res.set('Content-Type', 'text/xml')
           .send(data);
    });
});

/**
 * POST Rewrite changed map(any) file
 */
router.post('/upload-map', upmap.fields([{ name: 'file', maxCount: 10 }]), (req: Request, res: Response) => {
    logger.log(LOGGER_PREFIX, '[POST]', 'MAP_FILE_UPLOAD', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number]);
    TreeNode.clearCache();

    res.sendStatus(OK);
});

export default router;
