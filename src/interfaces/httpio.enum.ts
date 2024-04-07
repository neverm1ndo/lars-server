import { IncomingMessage } from "http";
import { Socket } from "socket.io";
import { IDBUser } from "./user";

export interface IIncomingMessage extends IncomingMessage {
    user?: IDBUser;
}

export interface ISocket extends Socket {
    request: IIncomingMessage;
}

export interface IHttpsOptions {
    key: string,
    cert: string,
    ca?: string,
    rejectUnauthorized: boolean
}