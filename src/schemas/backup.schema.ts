import { model, Schema } from 'mongoose';

export const BACKUP = model( 'Backup', new Schema ({
  unix: { type: Number, required: true },
  date: { type: Date, required: true },
  expires: { type: Date, required: true },
  user: {
    nickname: { type: String, required: true },
    group_id: Number
  },
  file: {
    name: String,
    mime: String,
    text: String
  }
}));
