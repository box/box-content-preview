const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../src/i18n');
const outDir = path.join(srcDir, 'json');
const baselinePath = path.join(srcDir, 'en-US.properties');

if (!fs.existsSync(baselinePath)) {
    throw new Error(`buildI18n: missing baseline ${baselinePath}`);
}

const parseProperties = text => {
    const messages = {};

    text.split(/\r?\n/).forEach(line => {
        if (!line || line.startsWith('#') || line.startsWith('!')) {
            return;
        }

        const separator = line.indexOf('=');
        if (separator === -1) {
            return;
        }

        messages[line.slice(0, separator)] = line.slice(separator + 1);
    });

    return messages;
};

const readProperties = filePath => parseProperties(fs.readFileSync(filePath, 'utf8'));
const baseline = readProperties(baselinePath);

fs.mkdirSync(outDir, { recursive: true });

fs.readdirSync(srcDir)
    .filter(file => file.endsWith('.properties'))
    .forEach(file => {
        const locale = file.replace(/\.properties$/, '');
        const merged = { ...baseline, ...readProperties(path.join(srcDir, file)) };
        fs.writeFileSync(path.join(outDir, `${locale}.json`), JSON.stringify(merged));
    });
