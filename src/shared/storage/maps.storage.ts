import { MulterFileRequest, MulterStorageCallback } from "@interfaces/multer";
import multer, { diskStorage, Multer } from "multer";

const mapStorage = diskStorage({
    destination: function <T extends MulterFileRequest>(req: T, _file: Express.Multer.File, cb: MulterStorageCallback) {
      cb(null, req.body.path ? req.body.path
                             : process.env.MAPS_PATH!);
    },
    filename: function (_req: any, file: Express.Multer.File, cb) {
      cb(null, file.originalname);
    },
});

export const upmap : Multer =  multer({ storage: mapStorage });