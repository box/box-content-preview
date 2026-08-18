const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const srcDir = path.resolve(__dirname, '../src/i18n');
const outDir = path.join(srcDir, 'json');
const props2es = require.resolve('@box/frontend/i18n/props2es.js');
const exportPrefix = 'export default ';

// props2es treats cwd/i18n/json as react-intl extract arrays, not locale maps.
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'preview-i18n-'));
const tmpI18n = path.join(tmpRoot, 'i18n');

try {
    fs.mkdirSync(tmpI18n);

    const propertyFiles = fs.readdirSync(srcDir).filter(file => file.endsWith('.properties'));
    if (!propertyFiles.includes('en-US.properties')) {
        throw new Error(`buildI18n: missing baseline ${path.join(srcDir, 'en-US.properties')}`);
    }

    propertyFiles.forEach(file => {
        fs.copyFileSync(path.join(srcDir, file), path.join(tmpI18n, file));
    });

    const result = spawnSync(process.execPath, [props2es], { cwd: tmpRoot, stdio: 'inherit' });
    if (result.error) {
        throw result.error;
    }
    if (result.signal) {
        throw new Error(`buildI18n: props2es killed by ${result.signal}`);
    }
    if (result.status !== 0) {
        throw new Error(`buildI18n: props2es exited ${result.status}`);
    }

    const loadLocale = file => {
        const text = fs.readFileSync(path.join(tmpI18n, file), 'utf8');
        if (!text.startsWith(exportPrefix)) {
            throw new Error(`buildI18n: unexpected props2es output in ${file}`);
        }
        return JSON.parse(text.slice(exportPrefix.length));
    };

    propertyFiles.forEach(file => {
        const js = file.replace(/\.properties$/, '.js');
        if (!fs.existsSync(path.join(tmpI18n, js))) {
            throw new Error(`buildI18n: props2es did not write ${js}`);
        }
    });

    const baseline = loadLocale('en-US.js');
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });

    propertyFiles.forEach(file => {
        const locale = file.replace(/\.properties$/, '');
        const merged = { ...baseline, ...loadLocale(`${locale}.js`) };
        fs.writeFileSync(path.join(outDir, `${locale}.json`), JSON.stringify(merged));
    });
} finally {
    try {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch (cleanupError) {
        process.stderr.write(`buildI18n: failed to remove temp dir ${tmpRoot}\n${cleanupError}\n`);
    }
}
