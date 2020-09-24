import PreviewError from '../PreviewError';

describe('lib/PreviewError', () => {
    describe('PreviewError()', () => {
        test('should maintain stack trace if possible', () => {
            Error.captureStackTrace = jest.fn();
            const previewError = new PreviewError('blah');
            expect(Error.captureStackTrace).toBeCalledWith(previewError, PreviewError);
        });

        test('should set properties on error', () => {
            const code = 'error_some';
            const displayMessage = 'Human read-able error message';
            const details = { foo: 'bar' };
            const message = 'Error: blah blah';

            const previewError = new PreviewError(code, displayMessage, details, message);

            expect(previewError.code).toBe(code);
            expect(previewError.displayMessage).toBe(displayMessage);
            expect(previewError.details).toBe(details);
            expect(previewError.message).toBe(message);
        });

        test('should default display message to generic error message if not provided', () => {
            const previewError = new PreviewError('some_code');
            expect(previewError.displayMessage).toBe('We’re sorry, the preview didn’t load.');
        });

        test('should default message to display message if message is not provided', () => {
            const previewError = new PreviewError('some_code');
            expect(previewError.message).toBe('We’re sorry, the preview didn’t load.');
        });
    });
});
