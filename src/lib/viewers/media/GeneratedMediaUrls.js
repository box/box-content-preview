export const GENERATED_MEDIA_LOCAL_BASE_URL = 'http://localhost:1024';

/**
 * Local generated assets are proxied through the preview dev server so the browser can read
 * duration/seekable metadata and avoid CORS preflight failures from python http.server.
 */
export const getGeneratedMediaBaseUrl = () => {
    if (typeof window !== 'undefined' && window.location?.origin) {
        return `${window.location.origin}/generated-local`;
    }

    return GENERATED_MEDIA_LOCAL_BASE_URL;
};

export const getGeneratedAudioUrl = source => {
    const cacheBust = 'v2';
    const urls = {
        'generated-fr': `${getGeneratedMediaBaseUrl()}/audio_fr.m4a?${cacheBust}`,
        'generated-ja': `${getGeneratedMediaBaseUrl()}/audio_ja.m4a?${cacheBust}`,
    };

    return urls[source];
};
