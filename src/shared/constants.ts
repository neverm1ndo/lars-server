import { createPool } from 'mysql2';
import Backuper from '@backuper';
import { Logger } from './Logger';
import multer, { Multer, diskStorage} from 'multer';
import cors from 'cors';
import { CronJob } from 'cron';
import experimentalStorage from '@shared/experimental.confstorage';
import { OMPServerControl } from '@shared/omp-server.control';

import { Processes } from '@enums/processes.enum';
import Statsman from '../Statsman';
import { ErrorCode } from '@enums/error.codes.enum';

export const paramMissingError = 'One or more of the required parameters was missing.';
export const noAvatarImageUrl: string = 'https://www.gta-liberty.ru/styles/prosilver_ex/theme/images/no_avatar.gif';

export const CommonErrors = {
  [ErrorCode.UNSUPPORTED_PLATFORM]: 'Platform is not supported',
  [ErrorCode.PARAM_MISSING]: 'One or more of the required parameters was missing.',
  [ErrorCode.CHILD_PROCESS_ALREADY_SERVED]: 'One of the requested child processes already served.',
  [ErrorCode.CHILD_PROCESS_IS_NOT_EXISTS]: 'Child process is not exists.',
}

export const statsman = new Statsman.OnlineMetric();
export const omp = new OMPServerControl();

export const SQLQueries: { [key: string]: string } = {
  GET_USER_BY_NAME: "SELECT phpbb_users.user_id, phpbb_users.user_email, phpbb_users.username, phpbb_users.user_avatar, phpbb_users.group_id AS main_group, role.secondary_group FROM phpbb_users INNER JOIN (SELECT phpbb_user_group.user_id, MAX(phpbb_user_group.group_id) as secondary_group FROM phpbb_users, phpbb_user_group WHERE phpbb_users.group_id BETWEEN 9 AND 14 AND phpbb_user_group.user_id = phpbb_users.user_id GROUP BY phpbb_user_group.user_id) AS role ON role.user_id = phpbb_users.user_id AND phpbb_users.username = ? LIMIT 1",
  GET_USER: "SELECT phpbb_users.user_id, phpbb_users.user_password, phpbb_users.username, phpbb_users.user_avatar, phpbb_users.user_email, phpbb_users.group_id AS main_group, role.secondary_group FROM phpbb_users INNER JOIN (SELECT phpbb_user_group.user_id, MAX(phpbb_user_group.group_id) as secondary_group FROM phpbb_users, phpbb_user_group WHERE phpbb_users.group_id BETWEEN 9 AND 14 AND phpbb_user_group.user_id = phpbb_users.user_id GROUP BY phpbb_user_group.user_id) AS role ON role.user_id = phpbb_users.user_id AND phpbb_users.user_email = ? LIMIT 1",
  GET_ADMIN_LIST: 'SELECT phpbb_users.user_id, phpbb_users.username, phpbb_users.user_avatar, phpbb_users.user_email, phpbb_users.group_id AS main_group, role.secondary_group FROM phpbb_users INNER JOIN (SELECT phpbb_user_group.user_id, MAX(phpbb_user_group.group_id) as secondary_group FROM phpbb_users, phpbb_user_group WHERE phpbb_users.group_id IN (?, ?, ?, ?, ?, ?) AND phpbb_user_group.user_id = phpbb_users.user_id GROUP BY phpbb_user_group.user_id) AS role ON role.user_id = phpbb_users.user_id',
  CHANGE_MAIN_GROUP: 'UPDATE phpbb_user_group, phpbb_users SET phpbb_user_group.group_id = ?, phpbb_users.group_id = ? WHERE phpbb_user_group.user_id = phpbb_users.user_id AND phpbb_users.user_id = ?;',
  CHANGE_SECONDARY_GROUP: 'UPDATE phpbb_user_group INNER JOIN (SELECT MAX(group_id) as group_id FROM phpbb_user_group WHERE group_id BETWEEN 9 AND 14 AND user_id = ? GROUP BY user_id) AS secondary_group SET phpbb_user_group.group_id = ? WHERE phpbb_user_group.group_id = secondary_group.group_id AND user_id = ?',
};

const experimentalConfigFileStorage = experimentalStorage({
  destination: function (req: any, _file: any, cb: any) {
    cb(null, req.body.path?req.body.path:process.env.CFG_DEFAULT_PATH!)
  },
  filename: function (_req: any, file: any, cb: any) {
    cb(null, file.originalname)
  }
});

const mapStorage = diskStorage({
  destination: function (req: any, _file: any, cb) {
    cb(null, req.body.path?req.body.path:process.env.MAPS_PATH!)
  },
  filename: function (_req: any, file: any, cb) {
    console.log(file)
    cb(null, file.originalname)
  }
});

const confStorage = diskStorage({
  destination: function (req: any, _file: any, cb) {
    cb(null, req.body.path?req.body.path:process.env.CFG_DEFAULT_PATH!)
  },
  filename: function (_req: any, file: any, cb) {
    cb(null, file.originalname)
  }
});

export const upmap : Multer =  multer({ storage: mapStorage });
export const upcfg : Multer =  multer({ storage: experimentalConfigFileStorage });
export const upfile: Multer =  multer({ storage: confStorage });

export const tailOnlineStats = new CronJob('0 */30 * * * *', () => {
  statsman.tail();
});

export const rmOldBackups = new CronJob('0 0 0 */1 * *', () => {
  Backuper.removeExpired()
          .then(() => {
            Logger.log('default', 'CRON', '->' ,'AUTO_CLEAR_OLD_BACKUPS');
          }).catch(err => {
            Logger.log('error', 'CRON_RM_BACKUPS', err.message);
          });
}, null, true, 'Europe/Moscow')


export const MSQLPool = createPool({
  host: process.env.DB_ADDRESS,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD
});

const whitelist: string[] = JSON.parse(process.env.CORS_WL!);

const checkCorsOrigin = function (origin: any, callback: any) {
  if (whitelist.indexOf(origin) !== -1 || !origin) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
};

export const CORSoptions = {
  credentials: true,
  methods: 'GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE',
  origin: checkCorsOrigin,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

export const socketCORS = {
  origin: checkCorsOrigin,
  methods: ['GET', 'POST'],
  credentials: true
}

export const corsOpt = cors(CORSoptions);

export const processTranslation = {
  ammoEnt: Processes.AMMO_ENTER,
  ammoLeav: Processes.AMMO_LEAVE,
  armBuy: Processes.ARMR_BUY,
  authCorrectAdm: Processes.AUTH_CORRECT_ADM,
  authCorrectGue: Processes.AUTH_CORRECT_GST,
  authCorrectUsr: Processes.AUTH_CORRECT_USR,
  authIncorrect: Processes.AUTH_INCORRECT,
  chatAdm: Processes.CHAT_ADM,
  chatBlock: Processes.CHAT_BLOCK_BLOCKED,
  chatBlockNin: Processes.CHAT_BLOCK_NIGM,
  chatBlockRep: Processes.CHAT_BLOCK_REPEATED,
  chatBlockFlood: Processes.CHAT_BLOCK_FLOOD,
  chatClose: Processes.CHAT_CLOSE,
  chatHandBlock: Processes.CHAT_MUTE_HAND,
  chatHandUnBlock: Processes.CHAT_UNMUTE_HAND,
  chatMain: Processes.CHAT_MAIN,
  chatTeam: Processes.CHAT_TEAM,
  chatReport: Processes.CHAT_REPORT,
  checkExpl: Processes.CHECK_EXPL_PLAYER,
  checkScrollF: Processes.CHECK_SCROLL_FALSE,
  checkScrollT: Processes.CHECK_SCROLL_TRUE,
  clotEnter: Processes.CLOTHES_SHOP_ENTER,
  clotLeave: Processes.CLOTHES_SHOP_LEAVE,
  cmdPreerrBlock: Processes.CMD_PREERR_BLOCKED,
  cmdPreerrFlood: Processes.CMD_PREERR_FLOOD,
  cmdPreerrNotF: Processes.CMD_PREERR_NOTFOUND,
  cmdPreerrNotInGame: Processes.CMD_PREERR_NOTINGAME,
  cmdPreerrPlayer: Processes.CMD_PREERR_PLAYER,
  cmdPreerrPre: Processes.CMD_PREERR_PRELOAD,
  cmdPreerrSynt: Processes.CMD_PREERR_SYNTAX,
  cmdPreproc: Processes.CMD_PREPROC,
  cmdSuccess: Processes.CMD_SUCCESS,
  connect: Processes.CONNECTION_CONNECT,
  connectDenyNameChars: Processes.CONNECTION_DENY_NAMECHARS,
  connectDenyNameLength: Processes.CONNECTION_DENY_NAMELENGTH,
  derbyEnter: Processes.DERBY_ENTER,
  derbyLeave: Processes.DERBY_LEAVE,
  devClickMap: Processes.DEV_CLICKMAP,
  devKeylog: Processes.DEV_KEYLOG,
  devVeh: Processes.DEV_VEH_ADD,
  devVehRm: Processes.DEV_VEH_RM,
  devWeap: Processes.DEV_WEAP,
  disconnect: Processes.DISCONNECT_LEAVE,
  disconnectKickBan: Processes.DISCONNECT_KICKBAN,
  disconnectKick: Processes.DISCONNECT_KICK,
  disconnectBan: Processes.DISCONNECT_BAN,
  disconnectTimeout: Processes.DISCONNECT_TIMEOUT,
  dmCreate: Processes.DM_CREATE,
  dmEnter: Processes.DM_ENTER,
  dmKick: Processes.DM_KICK,
  dmLeave: Processes.DM_LEAVE,
  dmOwn: Processes.DM_OWNER,
  dmRestore: Processes.DM_RESTORE,
  guardBlockOff: Processes.GUARD_BLOCK_OFF,
  guardBlockOn: Processes.GUARD_BLOCK_OFF,
  healthPick: Processes.HEALTH_PICKUP,
  healthBuy: Processes.HEALTH_BUY,
  pauseEnd: Processes.PAUSE_END,
  pauseStart: Processes.PAUSE_START,
  pickArt: Processes.PICKUP_ART,
  rconLogTrue: Processes.RCON_LOGIN_TRUE,
  spectateChange: Processes.SPECTATE_CHANGE,
  spectateDerbyBugSpawn: Processes.SPECTATE_DERBY_BUG_SPAWN,
  spectateDerbyChange: Processes.SPECTATE_DERBY_CHANGE,
  spectateDerbyEnter: Processes.SPECTATE_DERBY_ENTER,
  spectateEnter: Processes.SPECTATE_ENTER,
  spectateLeave: Processes.SPECTATE_LEAVE,
  tdmCreate: Processes.TDM_CREATE,
  tdmEnter: Processes.TDM_ENTER,
  tdmLeave: Processes.TDM_LEAVE,
  toBackupLoad: Processes.TIMEOUT_BACKUP_LOAD,
  toBackupSave: Processes.TIMEOUT_BACKUP_SAVE,
  weapBuy: Processes.WEAP_BUY,
  weapPick: Processes.WEAP_PICKUP,
  cnReq: Processes.CN_REQ,
  CnResSuccess: Processes.CN_RES_SUCCESS,
  cnResNotFound: Processes.CN_RES_NOT_FOUND,
  unbanCnAuto: Processes.CN_UNBAN_AUTO,
  banCnHand: Processes.CN_BAN_HAND,
  unbanCnHand: Processes.CN_UNBAN_HAND,
}
