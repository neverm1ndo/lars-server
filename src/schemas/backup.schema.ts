import { model, Schema } from 'mongoose';

export const BACKUP = model( 'Backup', new Schema ({
  unix: { type: Number, required: true },
  date: { type: Date, required: true },
  expires: { type: Date, required: true },
  action: { type: String, required: true },
  user: {
    nickname: { type: String, required: true },
    group_id: Number
  },
  file: {
    path: String,
    name: String,
    mime: String,
    binary: Boolean,
    text: String
  }
}));
