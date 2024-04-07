import { ALLOWED_BINARY_MIMES } from "../configs/allowed.bin.mimes";

/**
 * @returns {boolean} true if file is binary
 */
export function isBinary (mime: string | false): boolean {
    if (!mime) return false;

    return ALLOWED_BINARY_MIMES.includes(mime);
}