import { LogLine } from '@interfaces/logline';
import { GeoData } from '@interfaces/geodata';
import iconv from 'iconv-lite';

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

  public parseContent(line: string): string | undefined {
    const contentdataContainerAny = new RegExp(/(?<=')(.*)(?=')/); // Main (some data in quotes)
    const contentdataContainerTime = new RegExp(/\d+\s(минуты?а?)(\sи\s\d+\s(секунды?а?))?/); // Timer content
    const contentdataContainerOther = new RegExp(/(?<=\(\d+\)\s).*(?=\s\{)|(?=(\s'(.*)'))/); // Any other
    const contentdataContainerNoQuotes = new RegExp(/(?<=\(\d+\)\s)(.[^,|}|{]*)/); // Without quotes
    let parsed = line.match(contentdataContainerAny);
    if (parsed) return parsed[0];
    parsed = line.match(contentdataContainerTime);
    if (parsed) return parsed[0];
    parsed = line.match(contentdataContainerOther);
    if (parsed) return parsed[0];
    parsed = line.match(contentdataContainerNoQuotes);
    if (parsed) return parsed[0];
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
    return parsed;
  }
};
