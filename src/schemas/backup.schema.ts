import { model, Schema } from 'mongoose';

const backupSchema = new Schema ({
  unix: { type: Number, required: true },
  date: { type: Date, required: true },
  expires: { type: Date, required: true },
  action: { type: String || Number, required: true },
  user: {
    nickname: { type: String, required: true },
    group_id: Number
  },
  file: {
    path: String,
    name: String,
    mime: String,
    binary: Boolean
  }
});

export const BACKUP = model( 'Backup', backupSchema);
