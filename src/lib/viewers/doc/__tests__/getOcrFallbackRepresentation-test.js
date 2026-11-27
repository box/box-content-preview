import getOcrFallbackRepresentation from '../getOcrFallbackRepresentation';

describe('lib/viewers/doc/getOcrFallbackRepresentation', () => {
    const makeFile = (extension, entries) => ({
        extension,
        representations: { entries },
    });

    test('should return the pdf rep when it is successful', () => {
        const file = makeFile('docx', [
            { representation: 'pdf', status: { state: 'success' } },
            { representation: 'ORIGINAL', status: { state: 'success' } },
        ]);

        expect(getOcrFallbackRepresentation(file).representation).toBe('pdf');
    });

    test.each(['pending', 'none'])('should return the converting pdf rep for a non-pdf file (%s)', state => {
        const file = makeFile('docx', [{ representation: 'pdf', status: { state } }]);

        expect(getOcrFallbackRepresentation(file).representation).toBe('pdf');
    });

    test('should return null for a non-pdf file when the pdf rep has failed', () => {
        const file = makeFile('docx', [{ representation: 'pdf', status: { state: 'error' } }]);

        expect(getOcrFallbackRepresentation(file)).toBeNull();
    });

    test('should return null for a non-pdf file that has no pdf rep', () => {
        const file = makeFile('docx', [{ representation: 'ORIGINAL', status: { state: 'success' } }]);

        expect(getOcrFallbackRepresentation(file)).toBeNull();
    });

    test('should prefer the ready pdf rep for a pdf file', () => {
        const file = makeFile('pdf', [
            { representation: 'pdf', status: { state: 'success' } },
            { representation: 'ORIGINAL', status: { state: 'success' } },
        ]);

        expect(getOcrFallbackRepresentation(file).representation).toBe('pdf');
    });

    test('should fall back to the original rep for a pdf file when the pdf rep is not ready', () => {
        const file = makeFile('pdf', [
            { representation: 'pdf', status: { state: 'pending' } },
            { representation: 'ORIGINAL', status: { state: 'success' } },
        ]);

        expect(getOcrFallbackRepresentation(file).representation).toBe('ORIGINAL');
    });

    test('should fall back to the original rep for a pdf file when the pdf rep has failed', () => {
        const file = makeFile('pdf', [
            { representation: 'pdf', status: { state: 'error' } },
            { representation: 'ORIGINAL', status: { state: 'success' } },
        ]);

        expect(getOcrFallbackRepresentation(file).representation).toBe('ORIGINAL');
    });

    test('should return null for a pdf file that only has a failed ocr_pdf rep', () => {
        const file = makeFile('pdf', [{ representation: 'ocr_pdf', status: { state: 'error' } }]);

        expect(getOcrFallbackRepresentation(file)).toBeNull();
    });
});
