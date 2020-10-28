import { LogLine } from './interfaces/logline';
import { GeoData } from './interfaces/geodata';

export class Parser {

  constructor() {}

  public parseGeo(line: string): GeoData | undefined { // FIXME: Тут надо как-то поэлегантнее
    let r_geodata = new RegExp('{\(.*)}');
    let r_geodata2 = new RegExp(', ');
    let unparsedgeo = line.split(r_geodata)[1];
    if (unparsedgeo) {
      let geo = unparsedgeo.split(r_geodata2);
      return {
        country: geo[0],
        cc: geo[1].split(':')[1],
        ip: geo[2].split(':')[1],
        as: +geo[3].split(':')[1],
        ss: geo[4].split(':')[1],
        org: geo[5].split(':')[1],
        c: geo[6].split(':')[1]
      };
    } else { // No geodata
      return undefined;
    }
  }

  public parseContent(line: string): string | undefined {
    let r_contentdata = new RegExp("'\(.*)'");
    return line.split(r_contentdata)[1];
  }

  private splitter(textplane: string): string[] {
    let lines: string[] = [];
    lines = textplane.split('\n');
    return lines;
  }

  public parse(textplane: string): LogLine[] {
    let parsed: LogLine[] = [];
    this.splitter(textplane).forEach((line: string) => {
      let splits = line.split(' ');
      if (splits[0] !== '') {
        parsed.push({
          unix: +splits[0],
          date: splits[1],
          process: splits[2],
          nickname: splits[3],
          id: +splits[4].match('\[0-9]+')![0],
          geo: this.parseGeo(line),
          content: this.parseContent(line)
        });
      }
    });
    return parsed;
  }
};
