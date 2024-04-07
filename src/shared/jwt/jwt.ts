import jwt from 'jsonwebtoken';
import app from '@server';
import { IJwtPayload } from '@interfaces/user';


const getAppSecret = () => app.get('secret') as string;


export const generateToken = (userInfo: IJwtPayload): string => {
    return jwt.sign(userInfo, getAppSecret(), { algorithm: 'HS256'});
}
    
/**
 * @param {string} token 
 * @returns 
 */
export const decodeToken = (token: string): boolean => {
    return jwt.decode(token) ? true : false;
}


/**
 * @param {string} token 
 * @returns 
 */
export const verifyToken = async (token: string): Promise<IJwtPayload | null> => {
    return new Promise((resolve, reject) => {
        jwt.verify(token, getAppSecret(), (err: any, { id, username, main_group, permissions }: any) => {
            if (err) return reject(err);
            
            resolve({
                id,
                username,
                main_group,
                permissions,
            });
        });
    });
}

