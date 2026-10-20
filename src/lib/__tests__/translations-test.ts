type TranslationsModule = typeof import('../translations');

const loadTranslations = (): TranslationsModule => {
    let translations: TranslationsModule | undefined;
    jest.isolateModules(() => {
        // eslint-disable-next-line global-require
        translations = require('../translations');
    });
    return translations as TranslationsModule;
};

describe('lib/translations', () => {
    afterEach(() => {
        delete (global as Record<string, unknown>).__BCP_NPM_BUILD__;
        (global as Record<string, unknown>).__BCP_DEFAULT_MESSAGES__ = {};
    });

    describe('npm build', () => {
        beforeEach(() => {
            (global as Record<string, unknown>).__BCP_NPM_BUILD__ = true;
            (global as Record<string, unknown>).__BCP_DEFAULT_MESSAGES__ = {
                media_autoplay: 'Autoplay',
                media_speed: 'Speed',
            };
        });

        test('should translate with the bundled en-US messages by default', () => {
            const { translate } = loadTranslations();

            expect(translate('media_autoplay')).toBe('Autoplay');
        });

        test('should translate with bcp-prefixed host messages and ignore other keys', () => {
            const { setMessages, translate } = loadTranslations();

            setMessages({
                'bcp.media_autoplay': '自動再生',
                'be.media_speed': 'not ours',
                media_speed: 'not ours either',
            });

            expect(translate('media_autoplay')).toBe('自動再生');
            expect(translate('media_speed')).toBe('Speed');
        });

        test('should ignore non-string message values', () => {
            const { setMessages, translate } = loadTranslations();

            setMessages({ 'bcp.media_autoplay': { id: 'bcp.media_autoplay' } });

            expect(translate('media_autoplay')).toBe('Autoplay');
        });

        test('should return to en-US when messages are cleared', () => {
            const { setMessages, translate } = loadTranslations();

            setMessages({ 'bcp.media_autoplay': '自動再生' });
            setMessages(undefined);

            expect(translate('media_autoplay')).toBe('Autoplay');
        });

        test('should return the key when no message has it', () => {
            const { translate } = loadTranslations();

            expect(translate('missing_key')).toBe('missing_key');
        });
    });

    test('should report the selected language and default to en-US', () => {
        const { getLanguage, setLanguage } = loadTranslations();

        expect(getLanguage()).toBe('en-US');

        setLanguage('ja-JP');
        expect(getLanguage()).toBe('ja-JP');

        setLanguage(undefined);
        expect(getLanguage()).toBe('en-US');
    });
});
