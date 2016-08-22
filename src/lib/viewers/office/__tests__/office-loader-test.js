import OfficeLoader from '../office-loader';

const sandbox = sinon.sandbox.create();

describe('office-loader', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('constructor()', () => {
        it('should have the correct viewer', () => {
            expect(OfficeLoader.viewers[0]).to.deep.equal({
                REPRESENTATION: 'original',
                EXTENSIONS: ['xlsx'],
                SCRIPTS: ['office.js'],
                STYLESHEETS: [],
                CONSTRUCTOR: 'Office'
            });
            expect(OfficeLoader.viewers[1]).to.deep.equal({
                REPRESENTATION: 'pdf',
                EXTENSIONS: ['xlsx'],
                SCRIPTS: [
                    'third-party/doc/compatibility.js',
                    'third-party/doc/pdf.js',
                    'third-party/doc/pdf_viewer.js',
                    'third-party/doc/pdf.worker.js',
                    'document.js'],
                STYLESHEETS: ['third-party/doc/pdf_viewer.css', 'document.css'],
                CONSTRUCTOR: 'Document',
                PREFETCH: 'xhr'
            });
        });
    });

    describe('determineViewer()', () => {
        it('should choose the Office viewer if it is not disabled and the file is ok', () => {
            const file = {
                extension: 'xlsx',
                size: 1000,
                permissions: {
                    can_download: true
                },
                representations: {
                    entries: [{
                        representation: 'original'
                    }]
                }
            };

            const viewer = OfficeLoader.determineViewer(file);

            expect(viewer).to.deep.equal({
                REPRESENTATION: 'original',
                EXTENSIONS: ['xlsx'],
                SCRIPTS: ['office.js'],
                STYLESHEETS: [],
                CONSTRUCTOR: 'Office'
            });
        });

        it('should choose the Document viewer if the Office viewer is disabled', () => {
            const file = {
                extension: 'xlsx',
                size: 1000,
                permissions: {
                    can_download: true
                },
                representations: {
                    entries: [{
                        representation: 'original'
                    }, {
                        representation: 'pdf'
                    }]
                }
            };

            const viewer = OfficeLoader.determineViewer(file, ['Office']);

            expect(viewer).to.deep.equal({
                REPRESENTATION: 'pdf',
                EXTENSIONS: ['xlsx'],
                SCRIPTS: [
                    'third-party/doc/compatibility.js',
                    'third-party/doc/pdf.js',
                    'third-party/doc/pdf_viewer.js',
                    'third-party/doc/pdf.worker.js',
                    'document.js'],
                STYLESHEETS: ['third-party/doc/pdf_viewer.css', 'document.css'],
                CONSTRUCTOR: 'Document',
                PREFETCH: 'xhr'
            });
        });

        it('should choose the Document viewer if the file is too large', () => {
            const file = {
                extension: 'xlsx',
                size: 5242881,
                permissions: {
                    can_download: true
                },
                representations: {
                    entries: [{
                        representation: 'original'
                    }, {
                        representation: 'pdf'
                    }]
                }
            };

            const viewer = OfficeLoader.determineViewer(file, []);

            expect(viewer).to.deep.equal({
                REPRESENTATION: 'pdf',
                EXTENSIONS: ['xlsx'],
                SCRIPTS: [
                    'third-party/doc/compatibility.js',
                    'third-party/doc/pdf.js',
                    'third-party/doc/pdf_viewer.js',
                    'third-party/doc/pdf.worker.js',
                    'document.js'],
                STYLESHEETS: ['third-party/doc/pdf_viewer.css', 'document.css'],
                CONSTRUCTOR: 'Document',
                PREFETCH: 'xhr'
            });
        });

        it('should choose the Document viewer if the user does not have download permissions', () => {
            const file = {
                extension: 'xlsx',
                size: 1000,
                permissions: {
                    can_download: false
                },
                representations: {
                    entries: [{
                        representation: 'original'
                    }, {
                        representation: 'pdf'
                    }]
                }
            };

            const viewer = OfficeLoader.determineViewer(file, []);

            expect(viewer).to.deep.equal({
                REPRESENTATION: 'pdf',
                EXTENSIONS: ['xlsx'],
                SCRIPTS: [
                    'third-party/doc/compatibility.js',
                    'third-party/doc/pdf.js',
                    'third-party/doc/pdf_viewer.js',
                    'third-party/doc/pdf.worker.js',
                    'document.js'],
                STYLESHEETS: ['third-party/doc/pdf_viewer.css', 'document.css'],
                CONSTRUCTOR: 'Document',
                PREFETCH: 'xhr'
            });
        });
    });
});
