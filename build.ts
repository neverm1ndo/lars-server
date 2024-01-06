/**
 * Remove old files, copy front-end ones.
 */
import path from 'path';
import fs from 'fs/promises';
import { ExecException, ExecOptions, exec } from 'child_process';
import { get, isFunction } from 'lodash';

const config = {
    env: 'pre-start/env/',
    dist: {
        path: './dist/',
    },
    src: {
        path: './src/',
    },
    build: {
        cmd: 'tsc --build tsconfig.prod.json',
        cwd: './'
    },
    postbuild: {
        peg: (name: string) => `pegjs -o ${path.join('./dist/parser/', name, name + '.parser.js')} --cache --trace ./src/parser/grammar/${name}.grammar.pegjs`,
    },
};

const CONSOLE_MESSAGE = {
    RM: {
        CURRENT: 'Removing current build',
        SUCCESS: 'Removed',
    },
    BUILD: {
        PROCESSING: 'Transpiling *.ts source files',
        SUCCESS: (fin: number, start: number) => `${color.green('OK!')}\n\t${color.blue('Assembled in')} ${color.yellow(duration(fin - start))}`
    },
    POST_BUILD: {
        PEG_GEN: (curr?: number, all?: number) => `Generating parsers ${curr ?? 0}/${all ?? 0}`
    },
    get: function(field: string, ...args: unknown[]) {
        const message = get(this, field);
        return `${field.split('.').map((e) =>`[${e}]`).join('')} ` + (isFunction(message) ? message.call(null, ...args) : message);
    }
};

const color = {
    get _codes() {
        return {
            green: 32,
            yellow: 33,
            blue: 36,
            clear: 0
        };
    },
    _colorize: function(code: number, message: string) { return this._compileCode(code) + message + this._compileCode(0)},
    _compileCode: function(code: number) { return `\x1b[${code}m`; },
    blue: function(str: string) { return this._colorize(this._codes.blue, str); },
    green: function(str: string) { return this._colorize(this._codes.green, str); },
    yellow: function(str: string) { return this._colorize(this._codes.yellow, str); },
}

process.stdout.write(`\x1b[36m
     ██       █████  ██████  ███████
     ██      ██   ██ ██   ██ ██
     ██      ███████ ██████  ███████
     ██      ██   ██ ██   ██      ██
     ███████ ██   ██ ██   ██ ███████
     Server build script
\x1b[0m\n`);

(async function build(config) {
    try {
        const start = Date.now();

        // Remove current build
        console.info(CONSOLE_MESSAGE.get('RM.CURRENT'));
        await fs.rm(config.dist.path, { recursive: true, force: true });

        console.info(CONSOLE_MESSAGE.get('RM.SUCCESS'));

        // Restore dir structure
        const envDir = path.join(config.dist.path, config.env);
        await fs.mkdir(envDir, { recursive:  true });
        
        // Copy production env file
        const prodEnvFile: string = path.join(config.env, 'production.env');

        const [envSrc, envDest] = [
            config.src.path,
            config.dist.path
        ].map((libpath) => path.join(libpath, prodEnvFile));

        await fs.copyFile(envSrc, envDest);
        
        // Copy back-end files
        console.info(CONSOLE_MESSAGE.get('BUILD.PROCESSING'));

        await execCmd(config.build.cmd, { cwd: config.build.cwd });

        const fin = Date.now();

        console.info(CONSOLE_MESSAGE.get('BUILD.SUCCESS', fin, start));

        // Postbuild gen parsers
        let current = 0;

        const grammars = ['query'];
        
        for (let grammar of grammars) {
            console.info(CONSOLE_MESSAGE.get('POST_BUILD.PEG_GEN', current++, grammars.length));
            await execCmd(config.postbuild.peg(grammar), { cwd: config.build.cwd });
        }

   } catch(err) {
        console.error(err);
   }
})(config);

function duration(d: number): string {
    const format = {
        _ms: d,
        get ms() {
            return d % 1000;
        },
        get s() {
            return (d - this.ms) / 1000 
        },
        get m() { 
            return this.s / 60;
        },
    };

    const duration: Record<string, number> = {
        m: Math.floor(format.m),
        s: 0,
        ms: format.ms,
    };
    duration.s = format.s - duration.m*60;

    let str: string[] = [];

    for (let [scalar, val] of Object.entries(duration)) {
        if (val > 0) str.push(val + scalar);
    }

    return str.join(' ');
}

function execCmd(cmd: string, options: ExecOptions) {
    return new Promise<void>((resolve, reject) => {
        return exec(cmd, options, (err: ExecException | null, stdout: string, stderr: string) => {
            if (!!stdout) {
                console.info(stdout);
            }
            if (!!stderr) {
                console.warn(stderr);
            }
            return void(!!err ? reject(err) : resolve());
        });
    });
}