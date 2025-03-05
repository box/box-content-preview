const annotationMessages = {};

const language = __LANGUAGE__ || 'en-US'; // eslint-disable-line

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
    return {
        language,
        locale: getLocale(language),
        messages: annotationMessages,
    };
};

export default { createAnnotatorIntl };
