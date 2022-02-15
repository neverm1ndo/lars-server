import { LogLine, ContentData } from '@interfaces/logline';
import { GeoData } from '@interfaces/geodata';
import iconv from 'iconv-lite';
import { Logger } from '@shared/Logger';

export class Parser {
  constructor() {}

  parseGeoThing(unparsed: string, name: string): string {
    let geodata = new RegExp(`(?<=${name}:)(.[^,|}]*)`);
    return unparsed.match(geodata)![0];
  }
  parseCountry(unparsed: string): string {
    let countrydata = new RegExp(/([^\{])(.*(?=,\scc))/);
    return unparsed.match(countrydata)![0];
  }

  public parseGeo(line: string): GeoData | undefined {
    let geodataContainer = new RegExp(/{(.*)}/, 'g');
    let unparsedgeo = line.match(geodataContainer);
    if (!unparsedgeo) return undefined; // empty geodata field
    return {
      country: this.parseCountry(unparsedgeo[0]),
      cc: this.parseGeoThing(unparsedgeo[0], 'cc'),
      ip: this.parseGeoThing(unparsedgeo[0], 'ip'),
      as: +this.parseGeoThing(unparsedgeo[0], 'as'),
      ss: this.parseGeoThing(unparsedgeo[0], 'ss'),
      org: this.parseGeoThing(unparsedgeo[0], 'org'),
      c: this.parseGeoThing(unparsedgeo[0], 'cli')
    };
  }

  public parseContent(line: string): ContentData | undefined {
    const idRegex = new RegExp(/(?<=\()\d+(?=\))/);
    const contentdataContainerAny = new RegExp(/(?<=')(.*)(?=')/); // Main (some data in quotes)
    const contentdataContainerTime = new RegExp(/\d+\s(мин(ут)?ы?а?)(\sи\s\d+\s(секунды?а?))?/); // Timer content
    const contentdataContainerAdminAction = new RegExp(/\d+\s(мин(ут)?ы?а?)(\sи\s\d+\s(секунды?а?))?,\s(.*)?\s\(\d+\)\s'(.*)'/); // Admin action
    const contentdataContainerDeath = new RegExp(/(?<=\(\d+\)\s)(.*)\s\(\d+\)\sиз\s'(.*)'/); // Deaths
    const contentdataContainerOther = new RegExp(/(?<=\(\d+\)\s).*(?=\s\{)|(?=(\s'(.*)'))/); // Any other
    const contentdataContainerNoQuotes = new RegExp(/(?<=\(\d+\)\s)([A-Za-z0-9/-\s\.\:\;\+_\&\$\#\@\!\[\]]+(?=(\s\{|\n)))/); // Without quotes

    let parsed = line.match(contentdataContainerAdminAction);
    if (parsed) {
      return {
        message: contentdataContainerAny.test(parsed[0])?parsed[0].match(contentdataContainerAny)![0]: undefined,
        oid: idRegex.test(parsed[0])?Number(parsed[0].match(idRegex)![0]): undefined,
        op: idRegex.test(parsed[0])?parsed[0].match(new RegExp(/(?<=,\s).*(?=\s\()/))![0]: undefined,
        time: contentdataContainerTime.test(parsed[0])?parsed[0].match(contentdataContainerTime)![0]: undefined,
      }
    };
    parsed = line.match(contentdataContainerDeath);
    if (parsed) {
      return {
        message: contentdataContainerAny.test(parsed[0])?parsed[0].match(contentdataContainerAny)![0]: undefined,
        oid: idRegex.test(parsed[0])?Number(parsed[0].match(idRegex)![0]): undefined,
        op: idRegex.test(parsed[0])?parsed[0].match(new RegExp(/.*(?=\s\()/))![0]: undefined,
      }
    }
    parsed = line.match(contentdataContainerAny);
    if (parsed) return { message: parsed[0] };
    parsed = line.match(contentdataContainerTime);
    if (parsed) return { message: parsed[0] };
    parsed = line.match(contentdataContainerOther);
    if (parsed) return { message: parsed[0] };
    parsed = line.match(contentdataContainerNoQuotes);
    if (parsed) return { message: parsed[0] };
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
    const idRegex = new RegExp(/(?<=\()\d+(?=\))/);
    try {
      this.splitter(this.toUTF8(textplane)).forEach((line: string) => {
        let splits = line.split(' ');
        if (splits[0] !== '') {
          let result: LogLine = {
            unix: +splits[0],
            date: new Date(+splits[0]*1000),
            process: splits[2],
            nickname: splits[3],
            id: +line.match(idRegex)![0],
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
