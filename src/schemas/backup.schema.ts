import { model, Schema } from 'mongoose';

const backupSchema = new Schema ({
  unix: { type: Number, required: true },
  date: { type: Date, required: true },
  hash: { type: String, required: true },
  expires: { type: Date, required: true },
  action: { type: Number, required: true },
  user: {
    nickname: { type: String, required: true },
    group_id: Number,
    avatar: String,
  },
  file: {
    path: String,
    name: String,
    mime: String,
    binary: Boolean
  }
});

export const BACKUP = model( 'Backup', backupSchema);
