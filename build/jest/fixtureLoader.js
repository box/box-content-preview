const fs = require('fs');
const path = require('path');

const readFixtureFile = filePath => fs.readFileSync(path.resolve('src', 'lib', filePath), 'utf8');

const resetFixtureFile = () => {
    document.body.innerHTML = '';
};

const setHTMLFixture = htmlContent => {
    document.body.outerHTML = htmlContent;
};

const loadHTMLFixture = filePath => {
    return setHTMLFixture(readFixtureFile(filePath));
};

module.exports = {
    cleanup: resetFixtureFile,
    load: loadHTMLFixture,
};
