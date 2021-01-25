import { model, Schema } from 'mongoose';

export const LOG_LINE = model( 'LogLine', new Schema ({
  unix: { type: Number, required: true },
  date: { type: Date, required: true },
  process: { type: String, required: true },
  nickname: { type: String },
  id: { type: Number },
  content: { type: String },
  geo: {
    country: { type: String },
    cc: { type: String },
    ip: { type: String },
    as: { type: Number },
    ss: { type: String },
    org: { type: String },
    c: { type: String }
  }
}));
