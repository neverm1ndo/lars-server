/**
 * Remove old files, copy front-end ones.
 */
import path from 'path';
import fs from 'fs/promises';
import Logger from 'jet-logger';
import { ExecException, exec } from 'child_process';

// Setup logger

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
};

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
        console.info(' --- Removing current build...');
        await fs.rm(config.dist.path, { recursive: true, force: true });

        console.info(' --- removed!\n');

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
        console.info(' --- Transpiling *.ts source files...');
        await new Promise<void>((resolve, reject) => {
            return exec(config.build.cmd, { cwd: config.build.cwd }, (err: ExecException | null, stdout: string, stderr: string) => {
                if (!!stdout) {
                    console.info(stdout);
                }
                if (!!stderr) {
                    console.warn(stderr);
                }
                return void(!!err ? reject(err) : resolve());
            });
        });

        const fin = Date.now();

        console.info(' --- \x1b[32mOK!\n\t\x1b[36mAssembled in \x1b[33m' + duration(fin - start) + '\x1b[0m');

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
