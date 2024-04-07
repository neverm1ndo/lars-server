import { join } from 'path';

import express, { Request, Response, Express, Handler } from 'express';
import { connect, set } from 'mongoose';
import { MongoClient } from 'mongodb';

import cookieParser from 'cookie-parser';

import morgan from 'morgan';
import helmet from 'helmet';
import passport from 'passport';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import StatusCodes from 'http-status-codes';
import 'express-async-errors';


import { Strategy as JWTStrategy, ExtractJwt, StrategyOptions as JWTStrategyOptions } from 'passport-jwt';
import { Strategy as LocalStrategy, IStrategyOptions as ILocalStrategyOptions } from 'passport-local';


import BaseRouter from './routes';

import { watch,  } from '@shared/functions';
import { checkPassword, isWorkGroup } from '@shared/security';

import { IJwtPayload } from '@interfaces/user';
import { LoginAdminUserData } from '@entities/admin.entity';
import { MSQLPool, SQLQueries } from '@shared/sql';
import { rmOldBackups, tailOnlineStats } from '@shared/cron/tasks';

import { logger } from '@shared/logger';

const app: Express = express();

const { BAD_REQUEST, NOT_FOUND } = StatusCodes;
const { GET_USER_BY_ID, GET_USER } = SQLQueries;

/**
 * Express middlewares
 */
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.set('secret', process.env.ACCESS_TOKEN_SECRET);

// MongoDB connection
set('strictQuery', false);
const clientPromise = connect(process.env.MONGO!).then(m => m.connection.getClient() as unknown as MongoClient);

export const sessionMiddleware = session({
  secret: app.get('secret'),
  resave: false,
  saveUninitialized: true,
  cookie: { 
    maxAge: 525600*60000, 
    secure: true, 
    sameSite: 'none' 
  },
  store: MongoStore.create({ clientPromise: clientPromise }),
});

app.use(sessionMiddleware);

const jwtStrategyOptions: JWTStrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: app.get('secret'),
};

const jwtStrategy = new JWTStrategy(jwtStrategyOptions, (jwtPayload: IJwtPayload, done) => {
  void (async () => {
    try {
      const rawUser: LoginAdminUserData[] = await MSQLPool.promise()
                                              .query(GET_USER_BY_ID as string, [jwtPayload.id])
                                              .then(([rows]) => rows as LoginAdminUserData[]);
  
      const permissions: number[] = Array.from(new Set(rawUser.map((user) => user.secondary_group!)));
  
      const [user] = rawUser;
      user.permissions = permissions;
  
      if (!isWorkGroup(user.main_group)) {
        return void done(null, false, { message: 'User is not in workgroup' });
      }
  
      return void done(null, user);
    } catch (error) {
  
      return void done(error);
    }
  })();
});

const localStrategyOptions: ILocalStrategyOptions = {
  usernameField: 'email',
  passwordField: 'password',
};

const localStrategy: LocalStrategy = new LocalStrategy(localStrategyOptions, (email: string, password: string, done: any) => {
  void (async() => {
    try {
      const rawUser: LoginAdminUserData[] = await MSQLPool.promise()
                                           .query(GET_USER as string, [email])
                                           .then(([rows]) => rows as LoginAdminUserData[]);
      if (!rawUser.length) {
        return void done(null, false, { message: 'User not found' });
      }
  
      const permissions: number[] = Array.from(new Set(rawUser.map((user) => user.secondary_group!)));
      
      const [user] = rawUser;
      const { user_password, main_group } = user;
  
      user.permissions = permissions;
      
      if (!checkPassword(password, user_password)) {
        return void done(null, false, { message: 'Wrong password' });
      }
  
      if (!isWorkGroup(main_group)) {
        return void done(null, false, { message: 'User is not in workgroup' });
      }
      
      return void done(null, user, { message: 'Success' });
    } catch(error) {
      
      return void done(error);
    }
  })();
});

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(jwtPayload, done) {
  done(null, jwtPayload as Express.User);
});

app.use(passport.initialize());
app.use(passport.session() as Handler);

passport.use('local', localStrategy);
passport.use('jwt', jwtStrategy);

// Show routes called in console during development
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Security
if (process.env.NODE_ENV === 'production') {
    app.use(helmet());
}

// Add APIs
app.use('/.well-known/acme-challenge', express.static(join(__dirname, '../static/.well-known/acme-challenge')));
app.use('/v2', BaseRouter);

// 404
app.get('*', (_req: Request, res: Response) => {
  res.sendStatus(NOT_FOUND);
});

// Print API errors
app.use((err: Error, req: Request, res: Response) => {
    logger.log('[INTERNAL_ERROR]', 
      'SERVER', err, '\n',
      'ORIGINAL_URL', req.originalUrl, '\n',
      'PROTOCOL', req.protocol, '\n',
      'XHR', req.xhr,
    );
    return res.status(BAD_REQUEST)
              .send('ERR: ' + err.message);
});

// Crontasks
if (process.env.NODE_ENV === 'production') {
  rmOldBackups.start();
  tailOnlineStats.start();
}

// Watcher
watch();

// Export express instance
export default app;
