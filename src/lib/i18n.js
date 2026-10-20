import { getLanguage } from './translations';

const annotationMessages = {};

const getLocale = lang => {
    return lang.substr(0, lang.indexOf('-'));
};

/**
 * Creates Intl object used by annotations
 *
 * @private
 * @return {Object}
 */
const createAnnotatorIntl = () => {
    const language = getLanguage();
    return {
        language,
        locale: getLocale(language),
        messages: annotationMessages,
    };
};

export default { createAnnotatorIntl };
