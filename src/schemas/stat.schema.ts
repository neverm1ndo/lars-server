import { model, Schema } from 'mongoose';

const statSchema = new Schema({
  date: Date,
  label: String,
  data: [Number]
})

export const STAT = model('stat', statSchema);
