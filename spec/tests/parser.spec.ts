import { ILogLine } from '@interfaces/logline';
import { Parser2 } from 'src/Parser2';
import { lines } from 'spec/support/dummies';

describe('log line parser suite', function() {

    const parser: Parser2 = new Parser2(false);

    const fake_user_data = {
        id: 121,
        avatar: '123.png',
        main_group: 2,
        secondary_group: 2,
    };



    it('should parse incorrect auth log line', function() {
        const line = lines.auth.incorrect.regular;

        const clearly_parsed: ILogLine = {
            unix: 1688587991,
            date: new Date(1688587991000),
            process: '<auth/incorrect>',
            nickname: 'DummyDummyDummyDum',
            id: 0,
            content: {
                auth: {
                    ...fake_user_data,
                    username: 'Dummy',
                },
            },
            geo: {
                country: 'Russia',
                cc: 'RU',
                ip: '127.0.0.1',
                as: 8359, 
                ss: '5ADDEE08F89984DEE0D8CED489A59F0D95448C84', 
                org: 'ANY_ORG', 
                cli: '0.3.7',
            }
        };

        const parsed = parser.parse(Buffer.from(line));
              ((parsed.content as any).auth as any) = { ...parsed.content?.auth, ...fake_user_data };
        
        expect(parsed).toEqual(clearly_parsed);
    });

    it('should parse correct auth log line', function() {
        const line = lines.auth.correct.regular;

        const clearly_parsed: ILogLine = {
            unix: 1688587991,
            date: new Date(1688587991000),
            process: '<auth/correct>',
            nickname: 'Dummy',
            id: 0,
            content: {
                auth: {
                    ...fake_user_data,
                    username: 'Dummy'
                },
            },
            geo: {
                country: 'Russia',
                cc: 'RU',
                ip: '127.0.0.1',
                as: 8359, 
                ss: '5ADDEE08F89984DEE0D8CED489A59F0D95448C84', 
                org: 'ANY_ORG', 
                cli: '0.3.7',
            }
        };

        const parsed = parser.parse(Buffer.from(line));
              ((parsed.content as any).auth as any) = { ...parsed.content?.auth, ...fake_user_data };

        expect(parsed).toEqual(clearly_parsed);
    });

    it('should parse correct admin auth log line', function() {
        const line = lines.auth.correct.admin;

        const clearly_parsed: ILogLine = {
            unix: 1688587991,
            date: new Date(1688587991000),
            process: '<auth/correct/admin>',
            nickname: 'Dummy',
            id: 0,
            content: {
                auth: {
                    ...fake_user_data,
                    username: 'Dummy',
                    id: 121
                },
            },
            geo: {
                country: 'Russia',
                cc: 'RU',
                ip: '127.0.0.1',
                as: 8359, 
                ss: '5ADDEE08F89984DEE0D8CED489A59F0D95448C84', 
                org: 'ANY_ORG', 
                cli: '0.3.7',
            }
        };

        const parsed = parser.parse(Buffer.from(line));
              ((parsed.content as any).auth as any) = { ...parsed.content?.auth, ...fake_user_data };

        expect(parsed).toEqual(clearly_parsed);
    });

    it('should parse connect rejection line without player id', function() {
        const line = lines.auth.incorrect.no_id;

        const clearly_parsed: ILogLine = {
            unix: 1688587991,
            date: new Date(1688587991000),
            process: '<auth/incorrect>',
            nickname: 'DummyDummyDummyDum',
            id: undefined,
            geo: {
                country: 'Russia',
                cc: 'RU',
                ip: '127.0.0.1',
                as: 8359, 
                ss: '5ADDEE08F89984DEE0D8CED489A59F0D95448C84', 
                org: 'ANY_ORG', 
                cli: '0.3.7',
            }
        };

        const parsed = parser.parse(Buffer.from(line));

        expect(parsed).toEqual(clearly_parsed);
    });

    it('should parse cn response line without player id', function() {
        const line = lines.no_id.cn;

        const clearly_parsed: ILogLine = {
            unix: 1688587991,
            date: new Date(1688587991000),
            process: '<cn/response>',
            nickname: '[Dummy]_DummyDummy',
            id: undefined,
            content: {
                cn: 'L1HUXYLPSJNDKA8IQQK8L51UW2L44X'
            }
        };

        const parsed = parser.parse(Buffer.from(line));

        expect(parsed).toEqual(clearly_parsed);
    });

    it('should parse cn response line with player id', function() {
        const line = lines.cn;

        const clearly_parsed: ILogLine = {
            unix: 1688587991,
            date: new Date(1688587991000),
            process: '<cn/response>',
            nickname: '[Dummy]_DummyDummy',
            id: 0,
            content: {
                cn: 'L1HUXYLPSJNDKA8IQQK8L51UW2L44X'
            }
        };

        const parsed = parser.parse(Buffer.from(line));

        expect(parsed).toEqual(clearly_parsed);
    });

    it('should parse kill line', function() {
        const line = lines.kill.weapon;

        const clearly_parsed: ILogLine = {
            unix: 1688587991,
            date: new Date(1688587991000),
            process: '<any/process>',
            nickname: 'Dummy',
            id: 1,
            content: {
                op: 'Dummy2',
                oid: 0,
                message: 'Silenced 9mm'
            },
        };

        const buffer = Buffer.from(line);

        const parsed = parser.parse(buffer);

        expect(parsed).toEqual(clearly_parsed);
    });
   
    it('should parse message', function() {
        const line = lines.any_message.with;

        const clearly_parsed: ILogLine = {
            unix: 1688587991,
            date: new Date(1688587991000),
            process: '<any/process>',
            nickname: 'Dummy',
            id: 1,
            content: {
                message: 'из Silenced 9mm'
            },
        };

        const buffer = Buffer.from(line);

        const parsed = parser.parse(buffer);

        expect(parsed).toEqual(clearly_parsed);
    });

    it('should parse afk time', function() {
        const line = lines.afk.time;

        const clearly_parsed: ILogLine = {
            unix: 1688587991,
            date: new Date(1688587991000),
            process: '<any/process>',
            nickname: 'Dummy',
            id: 1,
            content: {
                message: '2 часа 3 минуты 34 секунды'
            },
        };

        const buffer = Buffer.from(line);

        const parsed = parser.parse(buffer);

        expect(parsed).toEqual(clearly_parsed);
    });

    it('should parse afk time', function() {
        const line = lines.dev.tp;

        const clearly_parsed: ILogLine = {
            unix: 1688587991,
            date: new Date(1688587991000),
            process: '<any/process>',
            nickname: 'Dummy',
            id: 1,
            content: {
                numbers: [532.501, -592.966, 123.0]
            },
        };

        const buffer = Buffer.from(line);

        const parsed = parser.parse(buffer);

        expect(parsed).toEqual(clearly_parsed);
    });
});