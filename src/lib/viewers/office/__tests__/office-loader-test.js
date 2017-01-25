import OfficeLoader from '../office-loader';

const sandbox = sinon.sandbox.create();

describe('office-loader', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('constructor()', () => {
        it('should have the correct viewer', () => {
            expect(OfficeLoader.viewers[0]).to.deep.equal({
                REP: 'ORIGINAL',
                EXT: ['xlsx'],
                JS: ['office.js'],
                CSS: [],
                NAME: 'Office'
            });
            expect(OfficeLoader.viewers[1]).to.deep.equal({
                REP: 'pdf',
                EXT: ['xlsx'],
                JS: [
                    'third-party/doc/compatibility.min.js',
                    'third-party/doc/pdf.min.js',
                    'third-party/doc/pdf_viewer.min.js',
                    'third-party/doc/pdf.worker.min.js',
                    'document.js'],
                CSS: ['third-party/doc/pdf_viewer.css', 'document.css'],
                NAME: 'Document',
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
                        representation: 'ORIGINAL'
                    }]
                }
            };

            const viewer = OfficeLoader.determineViewer(file);

            expect(viewer).to.deep.equal({
                REP: 'ORIGINAL',
                EXT: ['xlsx'],
                JS: ['office.js'],
                CSS: [],
                NAME: 'Office'
            });
        });

        it('should choose the Office viewer if it is not disabled and the file is a shared link that is not password-protected', () => {
            const file = {
                extension: 'xlsx',
                size: 1000,
                permissions: {
                    can_download: true
                },
                representations: {
                    entries: [{
                        representation: 'ORIGINAL'
                    }]
                },
                shared_link: {
                    is_password_enabled: false
                }
            };

            const viewer = OfficeLoader.determineViewer(file);

            expect(viewer).to.deep.equal({
                REP: 'ORIGINAL',
                EXT: ['xlsx'],
                JS: ['office.js'],
                CSS: [],
                NAME: 'Office'
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
                        representation: 'ORIGINAL'
                    }, {
                        representation: 'pdf'
                    }]
                }
            };

            const viewer = OfficeLoader.determineViewer(file, ['Office']);

            expect(viewer).to.deep.equal({
                REP: 'pdf',
                EXT: ['xlsx'],
                JS: [
                    'third-party/doc/compatibility.min.js',
                    'third-party/doc/pdf.min.js',
                    'third-party/doc/pdf_viewer.min.js',
                    'third-party/doc/pdf.worker.min.js',
                    'document.js'],
                CSS: ['third-party/doc/pdf_viewer.css', 'document.css'],
                NAME: 'Document',
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
                        representation: 'ORIGINAL'
                    }, {
                        representation: 'pdf'
                    }]
                }
            };

            const viewer = OfficeLoader.determineViewer(file, []);

            expect(viewer).to.deep.equal({
                REP: 'pdf',
                EXT: ['xlsx'],
                JS: [
                    'third-party/doc/compatibility.min.js',
                    'third-party/doc/pdf.min.js',
                    'third-party/doc/pdf_viewer.min.js',
                    'third-party/doc/pdf.worker.min.js',
                    'document.js'],
                CSS: ['third-party/doc/pdf_viewer.css', 'document.css'],
                NAME: 'Document',
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
                        representation: 'ORIGINAL'
                    }, {
                        representation: 'pdf'
                    }]
                }
            };

            const viewer = OfficeLoader.determineViewer(file, []);

            expect(viewer).to.deep.equal({
                REP: 'pdf',
                EXT: ['xlsx'],
                JS: [
                    'third-party/doc/compatibility.min.js',
                    'third-party/doc/pdf.min.js',
                    'third-party/doc/pdf_viewer.min.js',
                    'third-party/doc/pdf.worker.min.js',
                    'document.js'],
                CSS: ['third-party/doc/pdf_viewer.css', 'document.css'],
                NAME: 'Document',
                PREFETCH: 'xhr'
            });
        });

        it('should choose the Document viewer if the file is a password-protected shared link', () => {
            const file = {
                extension: 'xlsx',
                size: 1000,
                permissions: {
                    can_download: true
                },
                representations: {
                    entries: [{
                        representation: 'ORIGINAL'
                    }, {
                        representation: 'pdf'
                    }]
                },
                shared_link: {
                    is_password_enabled: true
                }
            };

            const viewer = OfficeLoader.determineViewer(file, []);

            expect(viewer).to.deep.equal({
                REP: 'pdf',
                EXT: ['xlsx'],
                JS: [
                    'third-party/doc/compatibility.min.js',
                    'third-party/doc/pdf.min.js',
                    'third-party/doc/pdf_viewer.min.js',
                    'third-party/doc/pdf.worker.min.js',
                    'document.js'],
                CSS: ['third-party/doc/pdf_viewer.css', 'document.css'],
                NAME: 'Document',
                PREFETCH: 'xhr'
            });
        });
    });
});
