import { charset, lookup } from "mime-types";
import { extname } from 'path';
import { modmimes } from "./modfiles.mimes";

const NO_MIME = '*/*';

export const getMimeType = (path: string): string => {
    const extension = extname(path);
    
    if (!extension) return NO_MIME;

    const modmime = modmimes.get(extension);
    
    if (modmime) return modmime;
    const mime = lookup(extension);

    if (!mime) return NO_MIME;

    return mime;
};

export const getCharset = (typeString: string): string | false => {
    return charset(typeString);
}