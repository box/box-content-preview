/* eslint-disable no-console */
/**
 * Writes dist/lib/i18n/<locale>.js for the npm package, one file per locale in
 * src/i18n/json (run yarn build:i18n first).
 *
 * Each file default-exports that locale's messages with keys prefixed by "bcp.", the
 * same shape box-ui-elements ships in its i18n/ folder. Hosts merge these files into
 * their language bundles and pass the merged messages to Preview.show() as intl.messages.
 */
const fs = require('fs');
const path = require('path');

const MESSAGE_KEY_PREFIX = 'bcp.';
const srcDir = path.resolve(__dirname, '../src/i18n/json');
const outDir = path.resolve(__dirname, '../dist/lib/i18n');

if (!fs.existsSync(srcDir)) {
    console.error(`buildLibI18n: ${srcDir} not found. Run yarn build:i18n first.`);
    process.exit(1);
}

fs.rmSync(outDir, { force: true, recursive: true });
fs.mkdirSync(outDir, { recursive: true });

const locales = fs
    .readdirSync(srcDir)
    .filter(file => file.endsWith('.json'))
    .map(file => path.basename(file, '.json'));

locales.forEach(locale => {
    const messages = JSON.parse(fs.readFileSync(path.join(srcDir, `${locale}.json`), 'utf8'));
    const prefixed = Object.fromEntries(
        Object.entries(messages).map(([key, value]) => [`${MESSAGE_KEY_PREFIX}${key}`, value]),
    );
    fs.writeFileSync(path.join(outDir, `${locale}.js`), `export default ${JSON.stringify(prefixed, null, 2)};\n`);
});

fs.writeFileSync(
    path.join(outDir, 'messages.d.ts'),
    'declare const messages: Record<string, string>;\nexport default messages;\n',
);

console.log(`buildLibI18n: wrote ${locales.length} locale files to dist/lib/i18n`);
