export class QueryPaser {
    private readonly _parser = require('./query.parser.js');

    public parse(value: string) {
        return this._parser.parse(value);
    }
}

new QueryPaser().parse('nickname.kek');