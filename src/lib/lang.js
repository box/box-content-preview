const languageMap = {
    chi: __('chinese'),
    zh: __('chinese'),
    zho: __('chinese'),
    da: __('danish'),
    dan: __('danish'),
    dut: __('dutch'),
    nl: __('dutch'),
    nld: __('dutch'),
    en: __('english'),
    eng: __('english'),
    fi: __('finnish'),
    fin: __('finnish'),
    fr: __('french'),
    fra: __('french'),
    fre: __('french'),
    de: __('german'),
    deu: __('german'),
    ger: __('german'),
    he: __('hebrew'),
    heb: __('hebrew'),
    it: __('italian'),
    ita: __('italian'),
    ja: __('japanese'),
    jpn: __('japanese'),
    ko: __('korean'),
    kor: __('korean'),
    no: __('norwegian'),
    nor: __('norwegian'),
    pl: __('polish'),
    pol: __('polish'),
    por: __('portuguese'),
    pt: __('portuguese'),
    ru: __('russian'),
    rus: __('russian'),
    es: __('spanish'),
    spa: __('spanish'),
    sv: __('swedish'),
    swe: __('swedish'),
    tr: __('turkish'),
    tur: __('turkish')
};

/**
 * Returns a localized language name, given an ISO-639-1/2/3/5 code:
 * https://en.wikipedia.org/wiki/List_of_ISO_639-2_codes
 *
 * @param {string} iso639Code - a 2 or 3-char language code per https://en.wikipedia.org/wiki/List_of_ISO_639-2_codes
 * @return {string} Returns the localized name of language represented by iso639Code
 */
export default function getLanguageName(iso639Code) {
    return languageMap[iso639Code.toLowerCase()];
}
