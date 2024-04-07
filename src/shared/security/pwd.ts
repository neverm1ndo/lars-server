import md5 from "md5";
import { PWD_OFFSET } from "./pwd.config";

export const checkPassword = (pass?: string, hash?: string): boolean => {
    
    if (!pass || !hash) return false;
      
    const salt = hash.slice(0, hash.length - PWD_OFFSET);
    const realPassword = hash.slice(hash.length - PWD_OFFSET, hash.length);
    const password = md5(salt + pass);
    
    if (password === realPassword) {
      return true;
    } 
    
    return false;
}