import { IDBUser } from '@interfaces/user';

export {}

declare global {
    namespace Express {
        export interface User extends IDBUser {
            [key: string]: any;
        }
    }
}