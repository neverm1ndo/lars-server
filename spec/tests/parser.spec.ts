import { ILogLine } from '@interfaces/logline';
import { Parser2 } from 'src/Parser2';

describe('log line parser suite', function() {

    const parser: Parser2 = new Parser2();

    const fake_user_data = {
        id: 121,
        avatar: '123.png',
        main_group: 2,
        secondary_group: 2,
    };

    it('should parse auth log line', function() {
        const line = "1688587991 20230705T231311 <auth/incorrect> Dummy (0) 'Dummy' {Russia, cc:RU, ip:127.0.0.1, as:8359, ss:5ADDEE08F89984DEE0D8CED489A59F0D95448C84, org:ANY_ORG, cli:0.3.7}";

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
        const line = "1688587991 20230705T231311 <auth/incorrect> DummyDummyDummyDum {Russia, cc:RU, ip:127.0.0.1, as:8359, ss:5ADDEE08F89984DEE0D8CED489A59F0D95448C84, org:ANY_ORG, cli:0.3.7}";

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
        const line = "1688587991 20230705T231311 <cn/response> [Dummy]_DummyDummy L1HUXYLPSJNDKA8IQQK8L51UW2L44X";

        const clearly_parsed: ILogLine = {
            unix: 1688587991,
            date: new Date(1688587991000),
            process: '<auth/incorrect>',
            nickname: '[Dummy]_DummyDummy',
            id: undefined,
            content: {
                message: 'L1HUXYLPSJNDKA8IQQK8L51UW2L44X'
            },
        };

        const parsed = parser.parse(Buffer.from(line));

        console.log(parsed)

        expect(parsed).toEqual(clearly_parsed);
    });


});