import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import cors from 'cors';
import jwte from 'express-jwt';
import helmet from 'helmet';
import { connect } from 'mongoose';

import express, { NextFunction, Request, Response } from 'express';
import expressWS from 'express-ws';
import StatusCodes from 'http-status-codes';
import 'express-async-errors';

import WsRouter from './routes/WS';
import BaseRouter from './routes';
import { Logger } from '@shared/Logger';
import { watch } from '@shared/functions';

const { app } = expressWS(express());
const { BAD_REQUEST } = StatusCodes;

const useCors = cors();

/************************************************************************************
 *                              Set basic express settings
 ***********************************************************************************/

app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.options('*', useCors);
app.set('secret', process.env.ACCESS_TOKEN_SECRET);
app.use('/v2', jwte({
  secret: app.get('secret'),
  algorithms: ['HS256'],
  credentialsRequired: false,
  getToken: (req: any) => {
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        return req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
      return req.query.token;
    }
    return null;
  }
}));

// MongoDB connection
connect(process.env.MONGO!, { useNewUrlParser: true, useUnifiedTopology: true });

// Show routes called in console during development
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Security
if (process.env.NODE_ENV === 'production') {
    app.use(helmet());
}

// Add APIs
app.use('/v2', BaseRouter);

// Print API errors
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    Logger.log('error', err);
    return res.status(BAD_REQUEST).json({
        error: err.message,
    });
});



/************************************************************************************
 *                              Serve front-end content
 ***********************************************************************************/

// const viewsDir = path.join(__dirname, 'views');
// app.set('views', viewsDir);
// const staticDir = path.join(__dirname, 'public');
// app.use(express.static(staticDir));
// app.get('*', (req: Request, res: Response) => {
//     res.sendFile('index.html', {root: viewsDir});
// });

watch();

// Export express instance
export default app;
