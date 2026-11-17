import { getLanguage } from './translations';

const annotationMessages = {};

const getLocale = lang => {
    const separatorIndex = lang.indexOf('-');
    return separatorIndex === -1 ? lang : lang.substr(0, separatorIndex);
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
