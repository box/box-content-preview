import { getGeneratedMediaBaseUrl } from './GeneratedMediaUrls';

/**
 * Transcript VTTs are proxied through the preview dev server to avoid CORS preflight
 * failures when the local asset server (python http.server) cannot handle OPTIONS.
 */
export const getGeneratedTranscriptBaseUrl = getGeneratedMediaBaseUrl;

export const GENERATED_TRANSCRIPT_PLACEHOLDER_IDS = {
    fra: -1001,
    jpn: -1002,
};

export const getGeneratedTranscriptTracks = () => {
    const baseUrl = getGeneratedTranscriptBaseUrl();

    return [
        {
            url: `${baseUrl}/transcript_und.vtt`,
            language: 'und',
            label: 'Auto Generated (Original)',
        },
        {
            url: `${baseUrl}/transcript_fr.vtt`,
            language: 'fra',
            label: 'Auto Generated (French)',
            alwaysAvailable: true,
        },
        {
            url: `${baseUrl}/transcript_ja.vtt`,
            language: 'jpn',
            label: 'Auto Generated (Japanese)',
            alwaysAvailable: true,
        },
    ];
};

/**
 * @param {{ url: string, language: string, label: string }} track
 * @return {Object}
 */
export function createGeneratedTranscriptPlaceholder({ url, language, label }) {
    return {
        id: GENERATED_TRANSCRIPT_PLACEHOLDER_IDS[language],
        language,
        label,
        generatedTranscriptUrl: url,
        isGeneratedPlaceholder: true,
    };
}
