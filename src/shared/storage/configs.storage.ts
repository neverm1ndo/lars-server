import { MulterFileRequest, MulterStorageCallback } from "@interfaces/multer";
import multer, { diskStorage, Multer } from "multer";

const confStorage = diskStorage({
    destination: function <T extends MulterFileRequest>(req: T, _file: any, cb: MulterStorageCallback) {
      cb(null, req.body.path?req.body.path:process.env.CFG_DEFAULT_PATH!)
    },
    filename: function (_req: any, file: Express.Multer.File, cb) {
      cb(null, file.originalname)
    }
});
  
export const upfile: Multer = multer({ storage: confStorage });