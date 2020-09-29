import express from 'express';

const PORT: number = 9009;

export default class Auth {
  app: any;
  constructor() {
    this.app = express();
  }
  init() {
    this.app.get('/auth', (req: any, res: any) => {

    });
    this.app.listen(PORT, () => {
      console.log('Server listening on ', PORT, ' port');
    });
  }
}
