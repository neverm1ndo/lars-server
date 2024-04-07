import { model, Schema } from 'mongoose';

const statSchema = new Schema({
    date: Date,
    label: String,
    data: [Number],
    labels: [Date],
})

export const STAT = model('stat', statSchema);
