import { model, Schema } from 'mongoose';

const logShema = new Schema({
    unix: { type: Number, required: true },
    date: { type: Date, required: true },
    process: { type: String, required: true },
    nickname: { type: String, required: true },
    id: { type: Number },
    content: {
        time: { type: String },
        oid: { type: Number },
        op: { type: String },
        weapon: { type: String },
        dm_id: { type: String },
        auth: {
            id: { type: Number },
            avatar: { type: String },
            username: { type: String },
            main_group: { type: Number },
            secondary_group: { type: Number },
        },
        message: { type: String },
        numbers: {
            type: [Number],
            required: false,
        },
        action: { type: String },
        targetType: { type: String },
            target: {
            id: { type: Number },
            username: { type: String },
        },
        props: {
            type: Schema.Types.Mixed
        },
        cn: { type: String },
        editor: {
            editor_id: { type: Number },
            g: { type: String },
            players: { type: Number },
            visitors: { type: Number }
        }
    },
    geo: {
        country: { type: String },
        cc: { type: String },
        ip: { type: String },
        as: { type: Number },
        ss: { type: String },
        org: { type: String },
        cli: { type: String }
    },
    multiplier: Number,
})

export const LOG_LINE = model('LogLine', logShema);
