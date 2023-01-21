import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import helmet from 'helmet';
import { join } from 'path';

import express, { NextFunction, Request, Response, Express } from 'express';
import passport from 'passport';
import { Strategy as JWTStrategy, ExtractJwt, StrategyOptions as JWTStrategyOptions } from 'passport-jwt';
import { Strategy as LocalStrategy, IStrategyOptions as ILocalStrategyOptions } from 'passport-local';
import session from 'express-session';
import MongoStore from 'connect-mongo';

import { connect, ConnectOptions } from 'mongoose';
import { rmOldBackups, SQLQueries, tailOnlineStats, MSQLPool } from '@shared/constants';

import BaseRouter from './routes';

import StatusCodes from 'http-status-codes';
import 'express-async-errors';

import { Logger } from '@shared/Logger';
import { watch, isWorkGroup, checkPassword } from '@shared/functions';
import { IDBUser, IJwtPayload } from '@interfaces/user';

const app: Express = express();

const { BAD_REQUEST, NOT_FOUND, UNAUTHORIZED } = StatusCodes;
const { GET_USER_BY_NAME, GET_USER } = SQLQueries;

/**
 * Express middlewares
 */
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// app.options('*', useCors);

app.set('secret', process.env.ACCESS_TOKEN_SECRET);

// MongoDB connection
const clientPromise = connect(process.env.MONGO!, { useNewUrlParser: true, useUnifiedTopology: true } as ConnectOptions).then(m => m.connection.getClient());

export const sessionMiddleware = session({
  secret: app.get('secret'),
  resave: false,
  saveUninitialized: true,
  cookie: { 
    maxAge: 525600*60000, 
    secure: true, 
    sameSite: 'none' 
  },
  store: MongoStore.create({ clientPromise }),
})

app.use(sessionMiddleware);

const jwtStrategyOptions: JWTStrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: app.get('secret'),
};

const jwtStrategy = new JWTStrategy(jwtStrategyOptions, async (jwtPayload: IJwtPayload, done) => {
  try {
    return done(null, jwtPayload);
  } catch (error) {
    done(error);
  }
});

const localStrategyOptions: ILocalStrategyOptions = {
  usernameField: 'email',
  passwordField: 'password',
};

const localStrategy: LocalStrategy = new LocalStrategy(localStrategyOptions, async (email: string, password: string, done: any) => {
  try {
    const [user]: IDBUser[] = await MSQLPool.promise()
                                            .query(GET_USER, [email])
                                            .then(([rows]: any) => rows);
    if (!user) {
      return done(null, false, { message: 'User not found' });
    }
    
    const { main_group, username, secondary_group, user_avatar, user_password, user_id } = user;
    
    if (!checkPassword(password, user_password)) {
      return done(null, false, { message: 'Wrong password' });
    }

    if (!isWorkGroup(main_group)) {
      return done(null, false, { message: 'User is not in workgroup' });
    }
    
    return done(null, user, { message: 'Success' });
  } catch(error) {
    return done(error);
  }
});

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(jwtPayload: IJwtPayload, done) {
  done(null, jwtPayload);
});

app.use(passport.initialize());
app.use(passport.session());

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
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    Logger.log('error', 
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
};

// Watcher
watch();

// Export express instance
export default app;
