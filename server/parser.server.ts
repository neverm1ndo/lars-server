import { LogLine } from './interfaces/logline';
import { GeoData } from './interfaces/geodata';
import iconv from 'iconv-lite';
import { DOMParser } from 'xmldom';

export class Parser {

  constructor() {}

  public parseMap(xml: string): { objects: number, coords: { x: string | null, y: string | null, z: string | null }, dim?: string | null, int?: string | null } {
    let parser = new DOMParser();
    let map = parser.parseFromString(xml);
    let firstobj =  map.getElementsByTagName("object")[0];
    return {
      objects: map.getElementsByTagName("map")[0].childNodes.length,
      coords: {
        x: firstobj.getAttribute('x'),
        y: firstobj.getAttribute('y'),
        z: firstobj.getAttribute('z'),
      },
      dim: firstobj.getAttribute('dimension'),
      int: firstobj.getAttribute('interior')
    };
  }

  public parseGeo(line: string): GeoData | undefined { // FIXME: Тут надо как-то поэлегантнее
    let r_geodata = new RegExp('{\(.*)}');
    let r_geodata2 = new RegExp(', ');
    let unparsedgeo = line.split(r_geodata)[1];
    if (unparsedgeo) {
      let geo = unparsedgeo.split(r_geodata2);
      if (geo[1].includes(':')) {
        return {
          country: geo[0],
          cc: geo[1].split(':')[1],
          ip: geo[2].split(':')[1],
          as: +geo[3].split(':')[1],
          ss: geo[4].split(':')[1],
          org: geo[5].split(':')[1],
          c: geo[6].split(':')[1]
        };
      } else {
        return {
          country: geo[0],
          ip: geo[1],
          as: +geo[2].replace('AS', ''),
          ss: geo[3],
        }
      }
    } else { // No geodata
      return undefined;
    }
  }

  public parseContent(line: string): string | undefined {
    let r_contentdata = new RegExp("'\(.*)'"); // Main
    let r_contentdata2 = new RegExp("\(\\(\[0-9]+\\)\)"); // Secondary
    let parsed = line.split(r_contentdata)[1];
    if (parsed) {
      return parsed;
    } else {
      parsed = line.split(r_contentdata2)[2].trim();
      if (parsed) {
        if (!parsed.includes('{')) {
          return parsed;
        } else {
          return undefined;
        }
      } else {
        return undefined;
      }
    }
  }

  private splitter(textplane: string): string[] {
    let lines: string[] = [];
    lines = textplane.split('\n');
    return lines;
  }

  public toUTF8(string: string | Buffer): string {
    if (typeof string == 'string') {
      return iconv.encode(iconv.decode(Buffer.from(string, 'binary'), 'win1251'), 'utf8').toString();
    } else {
      return iconv.encode(iconv.decode(string, 'win1251'), 'utf8').toString();
    }
  }
  public parse(textplane: string | Buffer): LogLine[] {
    // console.log(textplane.toString());
    let parsed: LogLine[] = [];
    this.splitter(this.toUTF8(textplane)).forEach((line: string) => {
      let splits = line.split(' ');
       if (splits[0] !== '') {
         let result: LogLine = {
           unix: +splits[0],
           date: splits[1],
           process: splits[2],
           id: 0
         };
        for (let i = 3; i < splits.length; i++) {
          if (splits[i].match('(\[0-9]+)'))  {
            result.id = +splits[i].match('(\[0-9]+)')![0];
            break;
          }
          // if (s == 'мин,') result.punish = splits[index - 1] + s;
        }
        result.geo = this.parseGeo(line);
        result.content = this.parseContent(line);
        if (splits[3].length > 3) {
          result.nickname = splits[3];
        } else {
          for (let i = 3; i < splits.length; i++) {
            if (splits[i - 1] == 'мин,') {
              result.nickname = splits[i];
              break;
            }
          }
        }
        // console.log(result);

        parsed.push(result);
      } else {
        // console.log(splits);
      }
    });
    return parsed;
  }
};
