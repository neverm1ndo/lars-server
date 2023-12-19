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



    it('should parse auth log line', function() {
        const line = lines.auth.correct;

        const clearly_parsed: ILogLine = {
            unix: 1688587991,
            date: new Date(1688587991000),
            process: '<auth/incorrect>',
            nickname: 'Dummy',
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

    it('should parse connect rejection line without player id', function() {
        const line = lines.auth.incorrect;

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
});