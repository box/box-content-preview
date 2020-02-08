import { IntlProvider } from 'react-intl';
import i18n from '../i18n';

describe('i18n', () => {
    it('should return an intl provider object', () => {
        const intl = i18n.createAnnotatorIntl();
        expect(intl.provider).to.be.an.instanceof(IntlProvider);
        expect(intl.language).to.equal('en-US');
        expect(intl.intlLocaleData).to.be.an('array');
    });
});
