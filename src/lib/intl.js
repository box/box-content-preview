import { IntlProvider, addLocaleData } from 'react-intl';
import intlLocaleData from 'react-intl-locale-data'; // eslint-disable-line

// TODO @mickryan remove after we upgrade the annotations version
let annotationMessages;

try {
    annotationMessages = require('box-annotations-messages'); // eslint-disable-line
} catch (e) {
    annotationMessages = {};
}

const language = __LANGUAGE__ || 'en-US'; // eslint-disable-line

/**
 * Creates Intl object used by annotations
 *
 * @private
 * @return {Object}
 */
const createAnnotatorIntl = () => {
    addLocaleData(intlLocaleData);
    const locale = language && language.substr(0, language.indexOf('-'));
    return {
        intlLocaleData,
        language,
        provider: new IntlProvider(
            {
                locale,
                messages: annotationMessages,
            },
            {},
        ),
    };
};

export default { createAnnotatorIntl };
