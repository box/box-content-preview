module.exports = {
    '*.js': ['eslint --fix', 'git add'],
    '*.json': ['prettier --write --parser=json', 'git add'],
    '*.html': ['prettier --write --parser=html', 'git add'],
    '*.md': ['prettier --write --parser=markdown', 'git add'],
    '*.scss': ['prettier --write --parser=scss', 'stylelint --syntax scss --fix', 'git add'],
    '*.ts': ['eslint --ext=.ts --fix', 'git add'],
    '*.tsx': ['eslint --ext=.tsx --fix', 'git add'],
};
