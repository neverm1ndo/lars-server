import { AdminUserData } from '@entities/admin.entity';

declare module 'express-serve-static-core' {
    interface Request {
        user?: AdminUserData;
    }
}