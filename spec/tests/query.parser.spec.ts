import { QueryParser } from "src/QueryParser";

describe('query parser suite', function() {
    
    const parser: QueryParser = new QueryParser();
    
    it('should parse cn query', function() {
        
        const query: string = 'cn:L1HUXYLPSJNDKA8IQQK8L51UW2L44X';
        const res = parser.parse(query);
        
        expect(res).toEqual({
            cn: ['L1HUXYLPSJNDKA8IQQK8L51UW2L44X']
        });
    });
    
    it('should parse cn query array', function() {
        
        const query: string = 'cn:L1HUXYLPSJNDKA8IQQK8L51UW2L44X,L1HUXYLPSJNDKA8IQQK8L51UW2L442';
        const res = parser.parse(query);
        
        expect(res).toEqual({
            cn: ['L1HUXYLPSJNDKA8IQQK8L51UW2L44X', 'L1HUXYLPSJNDKA8IQQK8L51UW2L442']
        });
    });

    it('should parse serials as(5) ss', function() {
        
        const query: string = 's:12345*L1HUXYLPSJNDKA8IQQK8L51UW2L442L51UW2L442';
        const res = parser.parse(query);
        
        expect(res).toEqual({ 
            as: '12345', 
            ss: 'L1HUXYLPSJNDKA8IQQK8L51UW2L442L51UW2L442'
        });
    });
    
    it('should parse serials as(4) ss', function() {
        
        const query: string = 's:1234*L1HUXYLPSJNDKA8IQQK8L51UW2L442L51UW2L442';
        const res = parser.parse(query);
        
        expect(res).toEqual({ 
            as: '1234', 
            ss: 'L1HUXYLPSJNDKA8IQQK8L51UW2L442L51UW2L442'
        });
    });

    it('should parse multi query', function() {
        
        const test = {
            nickname: ['Neverm1ndo', 'nmnd'],
            ip: ['127.0.0.1', '0.0.0.0']
        }

        const query: string = ((test: any): string => {
           return Object.keys(test).map((key: string) => {
                return key + ':' + test[key].join(','); 
            }).join('&');
        })(test);
        
        const res = parser.parse(query);
        
        expect(res).toEqual(test);
    });

});