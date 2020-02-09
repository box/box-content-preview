import i18n from '../i18n';

describe('i18n', () => {
    it('should return an intl provider object', () => {
        const intl = i18n.createAnnotatorIntl();
        expect(intl.messages).to.be.an('object');
        expect(intl.language).to.equal('en-US');
    });
});
