import PreviewError from '../PreviewError';

const sandbox = sinon.sandbox.create();

describe('lib/PreviewError', () => {
    describe('PreviewError()', () => {
        it('should maintain stack trace if possible', () => {
            Error.captureStackTrace = sandbox.stub();
            const previewError = new PreviewError('blah');
            expect(Error.captureStackTrace).to.be.calledWith(previewError, PreviewError);
        });

        it('should set properties on error', () => {
            const code = 'error_some';
            const displayMessage = 'Human read-able error message';
            const details = { foo: 'bar' };
            const message = 'Error: blah blah';

            const previewError = new PreviewError(code, displayMessage, details, message);

            expect(previewError.code).to.equal(code);
            expect(previewError.displayMessage).to.equal(displayMessage);
            expect(previewError.details).to.equal(details);
            expect(previewError.message).to.equal(message);
        });

        it('should default display message to generic error message if not provided', () => {
            const previewError = new PreviewError('some_code');
            expect(previewError.displayMessage).to.equal('We’re sorry, the preview didn’t load.');
        });

        it('should default message to display message if message is not provided', () => {
            const previewError = new PreviewError('some_code');
            expect(previewError.message).to.equal('We’re sorry, the preview didn’t load.');
        });
    });
});
