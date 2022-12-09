import jwt from 'jsonwebtoken';
import app from '@server';
import { IUserData, IJwtPayload } from '@interfaces/user';

export namespace JWT {
    export const generateToken = (userInfo: any): string => {
        return jwt.sign(userInfo, app.get('secret'), { algorithm: 'HS256'});
    }
      
    /**
     * @param {string} token 
     * @returns 
     */
    export const verifyToken = (token: string): boolean => {
        return jwt.decode(token, app.get('secret')) ? true : false;
    }
    
    /**
     * @param {string} token 
     * @returns 
     */
    export const decodeToken = async (token: string): Promise<IJwtPayload | null> => {
        return new Promise((resolve, reject) => {
            jwt.verify(token, app.get('secret'), (err: any, { id, username, main_group, secondary_group }: any) => {
                if (err) return reject(err);
                resolve({
                    id,
                    username,
                    main_group,
                    secondary_group,
                });
            });
        });
    }
}
