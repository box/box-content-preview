import OfficeLoader from '../OfficeLoader';
import Office from '../Office';

const sandbox = sinon.sandbox.create();

describe('lib/viewers/office/OfficeLoader', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
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
                NAME: 'Office',
                CONSTRUCTOR: Office,
                REP: 'ORIGINAL',
                EXT: ['xlsx']
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
            expect(viewer.NAME).to.equal('Office');
        });

        it('should not return a viewer if the Office viewer is disabled', () => {
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
            expect(viewer).to.equal(undefined);
        });

        it('should not return a viewer if the file is too large', () => {
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
            expect(viewer).to.equal(undefined);
        });

        it('should not return a viewer if the user does not have download permissions', () => {
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
            expect(viewer).to.equal(undefined);
        });

        it('should not return a viewer if the file is a password-protected shared link', () => {
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
            expect(viewer).to.equal(undefined);
        });
    });
});
