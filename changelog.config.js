module.exports = {
    options: {
        preset: {
            name: 'conventionalcommits',
            types: [
                { type: 'chore', section: 'Chores' },
                { type: 'feat', section: 'Features' },
                { type: 'fix', section: 'Bug Fixes' },
                { type: 'i18n', section: 'Internationalization' },
                { type: 'l10n', section: 'Localization' },
                { type: 'perf', section: 'Perf Improvements' },
                { type: 'refactor', section: 'Refactoring' },
                { type: 'revert', section: 'Reverts' },
                { type: 'style', section: 'Style Changes' },
            ],
        },
    },
};
