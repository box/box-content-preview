/* eslint-disable no-console */
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const locales = require('@box/languages');

// box-ui-elements queues every locale and runs 5 webpack processes at a time
// (scripts/buildLocaleAssets.js). Five is a concurrency cap, not a locale
// count: that repo uses the same 26 @box/languages locales and builds each
// twice (React bundled and React external). Preview ships one CDN bundle per
// locale. Two at a time matches the old multi-compiler cap, and each process
// has its own heap. Five Blueprint compilations at once can exhaust the agent.
const maxActive = 2;

// #1828 raised the single multi-compiler process to 8 GB because locales
// shared that heap. Each locale is now its own process, so start back at 4 GB.
const heapMb = 4096;

const dist = path.resolve('dist');
const sharedCopies = [
    [path.resolve('src/third-party'), dist],
    [path.resolve('src/lib/exif'), dist],
    [path.resolve('node_modules/pdfjs-dist/cmaps'), dist],
];

const children = new Set();

function copySharedAssets() {
    fs.mkdirSync(dist, { recursive: true });

    sharedCopies.forEach(([source, destination]) => {
        console.log(`Rsync ${source} -> ${destination}`);
        execSync(`rsync -avzq --delete --exclude=".*" "${source}" "${destination}"`, {
            stdio: 'inherit',
        });
    });
}

function buildLocale(locale) {
    return new Promise((resolve, reject) => {
        const child = spawn(
            process.execPath,
            [
                `--max_old_space_size=${heapMb}`,
                path.resolve('node_modules/webpack/bin/webpack.js'),
                '--progress',
                '--config',
                'build/webpack.config.js',
            ],
            {
                env: {
                    ...process.env,
                    BABEL_ENV: 'production',
                    NODE_ENV: 'production',
                    LANGUAGE: locale,
                    SKIP_SHARED_ASSETS: '1',
                },
                stdio: 'inherit',
            },
        );

        children.add(child);

        const finish = error => {
            children.delete(child);

            if (error) {
                reject(error);
                return;
            }

            resolve();
        };

        child.on('error', finish);
        child.on('exit', code => {
            if (code === 0) {
                finish();
                return;
            }

            finish(new Error(`Failed to build ${locale} (exit ${code})`));
        });
    });
}

function stopChildren() {
    children.forEach(child => {
        child.kill('SIGTERM');
    });
}

async function runLocales() {
    const queue = [...locales];
    let failure = null;

    async function worker() {
        while (queue.length > 0 && !failure) {
            const locale = queue.shift();
            console.log(`Building ${locale} (${locales.length - queue.length}/${locales.length})`);

            try {
                // One locale at a time per worker; the pool width is maxActive.
                // eslint-disable-next-line no-await-in-loop
                await buildLocale(locale);
            } catch (error) {
                failure = error;
                stopChildren();
            }
        }
    }

    const workerCount = Math.min(maxActive, locales.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    if (failure) {
        throw failure;
    }
}

copySharedAssets();

runLocales()
    .then(() => {
        console.log(`Finished building ${locales.length} locale bundles`);
    })
    .catch(error => {
        console.error(error.message);
        process.exit(1);
    });
