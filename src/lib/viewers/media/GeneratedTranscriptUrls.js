export const GENERATED_TRANSCRIPT_LOCAL_BASE_URL = 'http://localhost:1024';

export const GENERATED_TRANSCRIPT_TRACKS = [
    {
        url: `${GENERATED_TRANSCRIPT_LOCAL_BASE_URL}/transcript_und.vtt`,
        language: 'und',
        label: 'Auto Generated (Original)',
    },
    {
        url: `${GENERATED_TRANSCRIPT_LOCAL_BASE_URL}/transcript_en.vtt`,
        language: 'eng',
        label: 'Auto Generated (English)',
    },
    {
        url: `${GENERATED_TRANSCRIPT_LOCAL_BASE_URL}/transcript_fr.vtt`,
        language: 'fra',
        label: 'Auto Generated (French)',
    },
    {
        url: `${GENERATED_TRANSCRIPT_LOCAL_BASE_URL}/transcript_ja.vtt`,
        language: 'jpn',
        label: 'Auto Generated (Japanese)',
    },
];
