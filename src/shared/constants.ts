import { createPool } from 'mysql2';
import { Parser } from '@parser';
import { Watcher } from '@watcher';
import multer, { Multer, diskStorage} from 'multer';
import cors from 'cors';

export const paramMissingError = 'One or more of the required parameters was missing.';

export const parser = new Parser();
export const watcher = new Watcher();

const mapStorage = diskStorage({
  destination: function (req: any, file: any, cb) {
    cb(null, process.env.MAPS_PATH!)
  },
  filename: function (req: any, file: any, cb) {
    cb(null, file.originalname)
  }
});

const confStorage = diskStorage({
  destination: function (req: any, file: any, cb) {
    cb(null, process.env.CFG_PATH!)
  },
  filename: function (req: any, file: any, cb) {
    cb(null, file.originalname)
  }
});
export const upmap: Multer =  multer({ storage: mapStorage });
export const upcfg: Multer =  multer({ storage: confStorage });


export const MSQLPool = createPool({
  host: process.env.DB_ADDRESS,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD
});

export const CORSoptions = {
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'X-Access-Token',
      'Authorization'
    ],
    credentials: true,
    methods: 'GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE',
    origin: (origin: any, callback: any) => {
      if (JSON.parse(process.env.CORS_WL!).indexOf(origin) !== -1) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    preflightContinue: false,
  };
  export const corsOpt = cors(CORSoptions);
