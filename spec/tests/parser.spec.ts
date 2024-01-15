import { ILogLine } from '@interfaces/logline';
import { Parser2 } from 'src/Parser2';
import { lines } from 'spec/mocks/dummies';

describe('log line parser suite', function() {

    const parser: Parser2 = new Parser2(false);

    const fake_user_data = {
        id: 121,
        avatar: '123.png',
        main_group: 2,
        secondary_group: 2,
    };

    const fake_geo_data = {
        geo: {
            country: 'Russia',
            cc: 'RU',
            ip: '127.0.0.1',
            as: 8359, 
            ss: '5ADDEE08F89984DEE0D8CED489A59F0D95448C84', 
            org: 'ANY_ORG', 
            cli: '0.3.7',
        }
    }

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
            ...fake_geo_data
        };

        const parsed = parser.parse(Buffer.from(line));
              ((parsed.content as any).auth as any) = { ...parsed.content?.auth, ...fake_user_data };

        expect(parsed).toEqual(clearly_parsed);
    });
 
    it('should parse connection line', function() {
        const line = lines.connect;

        const clearly_parsed: ILogLine = {
            unix: 1688587991,
            date: new Date(1688587991000),
            process: '<connection/connect>',
            nickname: 'Dummy',
            id: 0,
            ...fake_geo_data
        };

        const parsed = parser.parse(Buffer.from(line));

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
            ...fake_geo_data
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
            ...fake_geo_data
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
        const logLines = lines.afk.time;

        const expectedMessages = [
            '2 часа 3 минуты 34 секунды',
            '3 минуты 34 секунды',
            '34 секунды',
        ];

        const clearly_parsed: ILogLine = {
            unix: 1688587991,
            date: new Date(1688587991000),
            process: '<any/process>',
            nickname: 'Dummy',
            id: 1,
            content: {},
        };

        logLines.forEach((line, index) => {            
            const buffer = Buffer.from(line);
            const parsed = parser.parse(buffer);

            clearly_parsed.content!.time = expectedMessages[index];
            expect(parsed).toEqual(clearly_parsed);
        });
    });

    it('should parse coord position', function() {
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

    it('should parse ban disconnect', function() {
        const line = lines.disconnect.ban;

        const clearly_parsed: ILogLine = {
            unix: 1688587991,
            date: new Date(1688587991000),
            process: '<disconnect/ban>',
            nickname: 'Dummy',
            id: 0,
            content: {
                op: "Администратор Admin",
                oid: 2,
                message: 'test'
            },
            ...fake_geo_data
        };

        const buffer = Buffer.from(line);

        const parsed = parser.parse(buffer);

        expect(parsed).toEqual(clearly_parsed);
    });
    
    it('should parse editor enter', function() {
            const line = lines.editor.enter;
    
            const clearly_parsed: ILogLine = {
                unix: 1688587991,
                date: new Date(1688587991000),
                process: '<editor/enter>',
                nickname: 'Dummy',
                id: 0,
                content: {
                    editor: {
                        editor_id: 2,
                        g: 'owner',
                        players: 1,
                        visitors: 0
                    }
                },
            };
    
            const buffer = Buffer.from(line);
    
            const parsed = parser.parse(buffer);
    
            expect(parsed).toEqual(clearly_parsed);
        });
});