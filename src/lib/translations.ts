import { isNpmBuild } from './isNpmBuild';

type StringTable = Record<string, string>;

declare const __BCP_DEFAULT_MESSAGES__: StringTable;
declare const __LANGUAGE__: string | undefined;

const DEFAULT_LANGUAGE = 'en-US';

// Keys in the published i18n/<locale>.js files carry this prefix so they can be merged
// with other packages' messages in a host's language bundle.
export const MESSAGE_KEY_PREFIX = 'bcp.';

// Only the npm build defines __BCP_DEFAULT_MESSAGES__; the CDN build bakes strings in per locale.
const defaultStrings: StringTable = isNpmBuild() ? __BCP_DEFAULT_MESSAGES__ : {};

let language = typeof __LANGUAGE__ !== 'undefined' && __LANGUAGE__ ? __LANGUAGE__ : DEFAULT_LANGUAGE;
let strings: StringTable = defaultStrings;

export function getLanguage(): string {
    return language;
}

export function setLanguage(nextLanguage?: string): void {
    language = nextLanguage || DEFAULT_LANGUAGE;
}

export function setMessages(messages?: Record<string, unknown>): void {
    strings = { ...defaultStrings };

    if (!messages) {
        return;
    }

    Object.keys(messages).forEach(key => {
        const value = messages[key];
        if (key.startsWith(MESSAGE_KEY_PREFIX) && typeof value === 'string') {
            strings[key.slice(MESSAGE_KEY_PREFIX.length)] = value;
        }
    });
}

export function translate(key: string): string {
    return strings[key] ?? key;
}
