import i18n from '../i18n';

describe('i18n', () => {
    test('should return an intl provider object', () => {
        const intl = i18n.createAnnotatorIntl();
        expect(intl.language).toBe('en-US');
        expect(intl.locale).toBe('en');
        expect(typeof intl.messages).toBe('object');
    });
});
