import i18n from '../i18n';
import { setLanguage } from '../translations';

describe('i18n', () => {
    afterEach(() => {
        setLanguage('en-US');
    });

    test('should return an intl provider object', () => {
        const intl = i18n.createAnnotatorIntl();
        expect(intl.language).toBe('en-US');
        expect(intl.locale).toBe('en');
        expect(typeof intl.messages).toBe('object');
    });

    test('should use the whole language as the locale when it has no region', () => {
        setLanguage('fr');

        const intl = i18n.createAnnotatorIntl();
        expect(intl.language).toBe('fr');
        expect(intl.locale).toBe('fr');
    });
});
