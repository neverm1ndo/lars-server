import path from 'path'
import { unlink } from 'fs/promises';
import { mkdir, rmdir, move } from 'fs-extra';

import StatusCodes from 'http-status-codes';
import { Router, Request, Response } from 'express';
import { json } from 'body-parser';

import Backuper, { BackupAction } from '@backuper';

import { io } from '../index';

import { logger } from '@shared/logger';
import Workgroup from '@enums/workgroup.enum';
import { TreeNode } from '@shared/file-tree/fs.treenode';

const LOGGER_PREFIX = '[UTILS]';

const router = Router();

const { OK, INTERNAL_SERVER_ERROR, CONFLICT, NOT_FOUND } = StatusCodes;

/**
 * DELETE Removes file from file system
 */
router.delete(
    '/delete-file',
    json(),
    (req: Request, res: Response) => {
    if (!req.query.path) {
        return void res.send(CONFLICT);
    }

    logger.log(LOGGER_PREFIX, '[DELETE]', 'FILE', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number], req.query.path);

    void (async() => {
        const filePath = req.query.path as string;

        try {
            await Backuper.backup(filePath, req.user!, BackupAction.DELETE);
            await unlink(filePath)
                    .then(() => {
                        TreeNode.clearCache();

                        res.send({ status: 'deleted' });
                    })
                    .catch((err: NodeJS.ErrnoException) => {
                        res.status(NOT_FOUND).send(err.message);
                    });

        } catch (err: any) {
            logger.err(LOGGER_PREFIX, '[DELETE]', 'FILE', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number], req.query.path);

            return void res.status(INTERNAL_SERVER_ERROR)
                           .end('Backuper error: ' + err.message);
        }
    })();
});

/**
 * GET download config file
 */
router.get('/download-file', (req: Request, res: Response) => {

  if (!req.query.path) {
    return void res.send(CONFLICT);
  }

  logger.log(LOGGER_PREFIX, '[GET]', 'FILE_DOWNLOAD', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number], req.query.path);

  res.sendFile(path.normalize(req.query.path as string));
});

/**
 * POST create new directory
 */
router.post(
    '/mkdir',
    json(),
    (req: Request<any, any, { path?: string }>, res: Response) => {
        if (!req.body.path) return res.send(CONFLICT);
        if (req.body.path == '/') return res.send(CONFLICT);

        logger.log(LOGGER_PREFIX, '[POST]', 'MKDIR', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number], req.body.path);

        new Promise<void>((res, rej) => {
            mkdir(decodeURI(req.body.path!), (err) => (err ? rej(err) : res()));
        })
        .then(() => {
            TreeNode.clearCache();
            res.send({
            status: OK,
            path: decodeURI(req.body.path!)
            });
        })
        .catch(err => {
            logger.err(LOGGER_PREFIX, '[POST]', 'MKDIR', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number], req.body.path, err.message);
            res.status(INTERNAL_SERVER_ERROR)
            .send(err);
        });
    }
);

/**
 * DELETE delete directory
 */
router.delete('/rmdir', (req: Request, res: Response) => {
    if (!req.query.path) return res.send(CONFLICT);

    const dirPath: string = decodeURI(req.query.path as string);
    if ([process.env.CFG_DEV_PATH, process.env.CFG_DEFAULT_PATH, process.env.MAPS_PATH].includes(dirPath)) return res.send(CONFLICT);

    logger.log(LOGGER_PREFIX, '[POST]', 'RMDIR', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number], req.query.path);

    new Promise<void>((res, rej) => {
        rmdir(dirPath, (err) => (err ? rej(err) : res()));
    })
    .then(() => {
        TreeNode.clearCache();
        res.send({ status: OK });
    })
    .catch((err) => {
        logger.log(LOGGER_PREFIX, '[POST]', 'RMDIR', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number], req.query.path, err.message);
        res.status(INTERNAL_SERVER_ERROR)
            .send(err);
    });
});

/**
 * PATCH move directory
 */
router.patch('/mvdir', json() ,(req: Request, res: Response) => {
    if (!req.body.path && !req.body.dest) return res.send(CONFLICT);

    const dirPath: string = decodeURI(req.body.path as string);
    const dirDestPath: string = decodeURI(req.body.dest as string);

    if ([process.env.CFG_DEV_PATH, process.env.CFG_DEFAULT_PATH, process.env.MAPS_PATH].includes(dirPath)) {
        return res.send(CONFLICT);
    }

    logger.log(LOGGER_PREFIX, '[POST]', 'MVDIR', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number], dirPath, '::', dirDestPath);

    new Promise<void>((res, rej) => {
        move(dirPath, dirDestPath, (err) => err ? rej(err) : res());
    })
    .then(() => {
        TreeNode.clearCache();
        res.send({ status: OK });
    })
    .catch(err => {
        logger.log(LOGGER_PREFIX, '[POST]', 'MVDIR', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number], dirPath, '::', dirDestPath);
        res.status(INTERNAL_SERVER_ERROR)
           .send(err);
    });
});

/**
 *  GET Emits soft update event
 */
router.get('/update-emitter', (req: Request, res: Response) => {
  logger.log(LOGGER_PREFIX, '[GET]', 'SOFT_UPDATE_EMIT', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number]);
  io.sockets.emit('update:soft');
  res.sendStatus(OK);
});

export default router;
