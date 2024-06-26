import Workgroup from '@enums/workgroup.enum';
import { Socket } from 'socket.io';
import { io } from '../index';
import { omp } from '@shared/constants';
import { getAvatarURL } from '@shared/functions';
import { ISocket } from '@interfaces/httpio.enum';
import { logger } from '@shared/logger';


const { DEV } = Workgroup;

const LOGGER_PREFIX = '[SOCKET]';

enum ServerStatus {
  OFFLINE = 1,
  REBOOTING,
  LIVE,
  LAUNCHING,
}

export enum UserActivity {
  IDLE,
  IN_LOGS,
  IN_MAPS,
  REDACT,
  IN_BANS,
  IN_ADM,
  IN_BACKS,
  IN_STATS
}

const isDev = (socket: ISocket): boolean => {
    return socket.request.user?.main_group === DEV;
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
export const wrap = (middleware: any) => (socket: Socket, next: any) => middleware(socket.request, {}, next);

const sockets = (socket: ISocket) => {
    void (async() => {
        const room = isDev(socket) ? socket.join('devs')
                                    : socket.join('main');
        try {
            await room;

            if (socket.handshake.auth.app === 'modloader') await socket.join('server_log');

        } catch(err) {
            console.error(err);
        }
    })();

    logger.log(LOGGER_PREFIX, 'USER_CONNECT', `(${socket.handshake.address})`, socket.request.user?.username, Workgroup[socket.request.user?.main_group as number]);

    socket.on('get-status', async () => {
        if (!isDev(socket)) return;

        try {
            const status: boolean = await omp.getServerStatus();

            logger.log(LOGGER_PREFIX, 'SERVER_GET_STATUS', `(${socket.handshake.address})`, socket.request.user?.username, status);

            socket.emit('server-status', status ? ServerStatus.LIVE : ServerStatus.OFFLINE);
        } catch (error: any) {
            logger.err(LOGGER_PREFIX, 'SERVER_STATUS', error.message);

            socket.emit('server-error', error);
        }
    });

    socket.on('reboot-server', async () => {
        if (!isDev(socket)) return;

        logger.log(LOGGER_PREFIX, 'SERVER_REBOOT', `(${socket.handshake.address})`, socket.request.user?.username);

        io.sockets.emit('server-status', ServerStatus.REBOOTING);
        io.sockets.emit('alert:server-rebooting', {
            username: socket.request.user?.username,
            user_avatar: getAvatarURL(socket.request.user?.user_avatar ?? ''),
            group_id: socket.request.user?.main_group,
        });

        try {
            await omp.reboot();

            socket.broadcast.to('devs').emit('server-rebooted');
            io.sockets.emit('server-status', ServerStatus.LIVE);

            logger.log(LOGGER_PREFIX, 'SERVER_REBOOT_SUCCESS', `(${socket.handshake.address})`, socket.request.user?.username);
        } catch(error: any) {
            logger.err(LOGGER_PREFIX, 'SERVER_REBOOT', `(${socket.handshake.address})`, socket.request.user?.username);

            socket.broadcast.to('devs').emit('server-error', error);
        }
    });

    socket.on('stop-server', async () => {
        if (!isDev(socket)) return;

        logger.log(LOGGER_PREFIX, 'SERVER_STOP', `(${socket.handshake.address})`, socket.request.user?.username);

        try {
            const stdout = await omp.stop();

            io.sockets.emit('server-stoped', stdout);
            io.sockets.emit('server-status', ServerStatus.OFFLINE);
            io.sockets.emit('alert:server-stoped', {
                username: socket.request.user?.username,
                user_avatar: getAvatarURL(socket.request.user?.user_avatar ?? ''),
                group_id: socket.request.user?.main_group,
            });

            logger.log(LOGGER_PREFIX, 'SERVER_STOP_SUCCESS', `(${socket.handshake.address})`, socket.request.user?.username);
        } catch (error: any) {
            logger.err(LOGGER_PREFIX, 'SERVER_STOP_FAIL', `(${socket.handshake.address})`, socket.request.user?.username);
            
            socket.broadcast.to('devs').emit('server-error', error);
        }
    });

    socket.on('launch-server', async () => {
        if (!isDev(socket)) return;

        logger.log(LOGGER_PREFIX, 'SERVER_LAUNCH', `(${socket.handshake.address})`, socket.request.user?.username);

        io.emit('server-status', ServerStatus.LAUNCHING);

        try {
            await omp.launch();

            io.sockets.emit('server-launched');
            logger.log(LOGGER_PREFIX, 'SERVER_LAUNCH_SUCCESS', `(${socket.handshake.address})`, socket.request.user?.username);
        } catch(error) {
            logger.err(LOGGER_PREFIX, 'SERVER_STOP_FAIL', `(${socket.handshake.address})`, socket.request.user?.username);
            
            socket.broadcast.to('devs').emit('server-error', error);
        }
    });

    socket.on('user-action', (action) => {
        logger.log(LOGGER_PREFIX, 'USER_ACTION', `(${socket.handshake.address})`, socket.request.user?.username, UserActivity[action]);

        socket.data.activity = action;
            io.sockets.emit('user-activity', {
            user: socket.request.user?.username,
            action
        });
    });

    socket.on('join:monitor', async () => {
        logger.log(LOGGER_PREFIX, 'JOIN_SERVER_MONITOR', `(${socket.handshake.address})`, socket.request.user?.username);
        await socket.join('server_log');
    });

    socket.on('update', () => {
        socket.emit('update:soft');
    });

    socket.on('disconnect', (reason) => {
        logger.log(LOGGER_PREFIX, 'USER_DISCONNECT', `(${socket.handshake.address})`, socket.request.user?.username);
        socket.broadcast.to('devs').emit('user-activity', 'offline', reason);
    });
}

export default sockets;
