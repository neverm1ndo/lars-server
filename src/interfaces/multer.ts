export interface MulterFileRequest extends Express.Request {
    body: {
        path: string;
    }
}

export type MulterStorageCallback = (error: Error | null, filename: string) => void;