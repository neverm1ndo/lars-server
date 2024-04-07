import { MulterFileRequest } from '@interfaces/multer';
import experimentalStorage from './experimental.confstorage';
import multer, { Multer } from 'multer';

const experimentalConfigFileStorage = experimentalStorage({
    destination: function <T extends MulterFileRequest>(req: T, _file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) {
      cb(null, req.body?.path ? req.body.path
                              : process.env.CFG_DEFAULT_PATH!
      );
    },
    filename: function (_req: any, file: any, cb: any) {
      cb(null, file.originalname);
    }
});

export const upcfg : Multer =  multer({ storage: experimentalConfigFileStorage });
