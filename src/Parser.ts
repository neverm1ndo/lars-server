import { LogLine, ContentData } from '@interfaces/logline';
import { GeoData } from '@interfaces/geodata';
import iconv from 'iconv-lite';
import { Logger } from '@shared/Logger';

export class Parser {

  private regexp = {
    idRegex : new RegExp(/(?<=\()\d+(?=\))/),
    contentdataContainerAny : new RegExp(/(?<=')(.*)(?=')/), // Main (some data in quotes)
    contentdataContainerTime : new RegExp(/\d+\s(мин(ут)?ы?а?)(\sи\s\d+\s(секунды?а?))?/), // Timer content
    contentdataContainerAdminAction : new RegExp(/\d+\s(мин(ут)?ы?а?)(\sи\s\d+\s(секунды?а?))?,\s(.*)?\s\(\d+\)\s'(.*)'/), // Admin action
    contentdataContainerDeath : new RegExp(/(?<=\(\d+\)\s)(.*)\s\(\d+\)\sиз\s'(.*)'/), // Deaths
    contentdataContainerOther : new RegExp(/(?<=\(\d+\)\s).*(?=\s\{)|(?=(\s'(.*)'))/), // Any other
    contentdataContainerNoQuotes : new RegExp(/(?<=\(\d+\)\s)([A-Za-z0-9/-\s\.\:\;\+_\&\$\#\@\!\[\]]+(?!\{))/), // Without quotes
  };

  constructor() {}

  private parseGeoThing(unparsed: string, name: string): string {
    let geodata = new RegExp(`(?<=${name}:)(.[^,|}]*)`);
    return unparsed.match(geodata)![0];
  }

  private parseCountry(unparsed: string): string {
    let countrydata = new RegExp(/([^\{])(.*(?=,\scc))/);
    return unparsed.match(countrydata)![0];
  }

  public parseGeo(line: string): GeoData | undefined {
    let geodataContainer = new RegExp(/{(.*)}/, 'g');
    let unparsedgeo = line.match(geodataContainer);
    if (!unparsedgeo) return undefined; // empty geodata field
    const geo = unparsedgeo[0];
    return {
      country: this.parseCountry(geo),
      cc: this.parseGeoThing(geo, 'cc'),
      ip: this.parseGeoThing(geo, 'ip'),
      as: +this.parseGeoThing(geo, 'as'),
      ss: this.parseGeoThing(geo, 'ss'),
      org: this.parseGeoThing(geo, 'org'),
      c: this.parseGeoThing(geo, 'cli')
    };
  }

  public parseContent(line: string): ContentData | undefined {
    let parsed = line.match(this.regexp.contentdataContainerAdminAction);
    if (parsed) {
      return {
        message: this.regexp.contentdataContainerAny.test(parsed[0])?parsed[0].match(this.regexp.contentdataContainerAny)![0]: undefined,
        oid: this.regexp.idRegex.test(parsed[0])?Number(parsed[0].match(this.regexp.idRegex)![0]): undefined,
        op: this.regexp.idRegex.test(parsed[0])?parsed[0].match(new RegExp(/(?<=,\s).*(?=\s\()/))![0]: undefined,
        time: this.regexp.contentdataContainerTime.test(parsed[0])?parsed[0].match(this.regexp.contentdataContainerTime)![0]: undefined,
      }
    };
    parsed = line.match(this.regexp.contentdataContainerDeath);
    if (parsed) {
      return {
        message: this.regexp.contentdataContainerAny.test(parsed[0])?parsed[0].match(this.regexp.contentdataContainerAny)![0]: undefined,
        oid: this.regexp.idRegex.test(parsed[0])?Number(parsed[0].match(this.regexp.idRegex)![0]): undefined,
        op: this.regexp.idRegex.test(parsed[0])?parsed[0].match(new RegExp(/.*(?=\s\()/))![0]: undefined,
      }
    }
    parsed = line.match(this.regexp.contentdataContainerAny);
    if (parsed) return { message: parsed[0].trimEnd() };
    parsed = line.match(this.regexp.contentdataContainerTime);
    if (parsed) return { message: parsed[0].trimEnd() };
    parsed = line.match(this.regexp.contentdataContainerOther);
    if (parsed) return { message: parsed[0].trimEnd() };
    parsed = line.match(this.regexp.contentdataContainerNoQuotes);
    if (parsed) return { message: parsed[0].trimEnd() };
    return undefined; // empty content field
  }

  private splitter(textplane: string): string[] {
    let lines: string[] = [];
    lines = textplane.split('\n');
    return lines;
  }

  public ANSItoUTF8(buffer: Buffer): string {
    return iconv.encode(iconv.decode(buffer, 'win1251'), 'utf8').toString();
  }
  public UTF8toANSI(buf: any): Buffer {
    return iconv.encode(buf.toString(), 'win1251');
  }
  public toUTF8(string: string | Buffer): string {
    if (typeof string == 'string') {
      return iconv.encode(iconv.decode(Buffer.from(string, 'binary'), 'win1251'), 'utf8').toString();
    } else {
      return iconv.encode(iconv.decode(string, 'win1251'), 'utf8').toString();
    }
  }

  public parse(textplane: string | Buffer): LogLine[] {
    let parsed: LogLine[] = [];
    try {
      this.splitter(this.toUTF8(textplane)).forEach((line: string) => {
        let splits = line.split(' ');
        if (splits[0] !== '') {
          let result: LogLine = {
            unix: +splits[0],
            date: new Date(+splits[0]*1000),
            process: splits[2],
            nickname: splits[3],
            id: +line.match(this.regexp.idRegex)![0],
            content: this.parseContent(line),
            geo: this.parseGeo(line),
          };
          parsed.push(result);
        }
      });
    } catch(err) {
      Logger.log('error', this.ANSItoUTF8(textplane as Buffer));
      Logger.log('error', err);
    }
    return parsed;
  }
};
