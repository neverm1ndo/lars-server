import express from 'express';
import fs from 'fs';

const PORT: number = 9809;

export default class API {
  app: any;
  constructor() {
    this.app = express();
  }
  init() {
    this.app.listen(PORT, () => {
      console.log('Server listening on ', PORT, ' port');
    });
  }
}
