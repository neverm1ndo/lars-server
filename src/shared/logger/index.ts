import { Logger } from './Logger2';

export * from './Logger2';

export const logger: Logger = new Logger(process.env.LARS_LOGS_PATH!, 'log'); 