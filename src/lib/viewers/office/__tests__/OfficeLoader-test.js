import OfficeLoader from '../OfficeLoader';
import OfficeViewer from '../OfficeViewer';
import * as file from '../../../file';

const FIVE_MB = 5242880;

describe('lib/viewers/office/OfficeLoader', () => {
    const fakeFileTemplate = {
        size: 1000,
        permissions: {
            can_download: true,
        },
        representations: {
            entries: [
                {
                    representation: 'ORIGINAL',
                },
            ],
        },
    };

    describe('determineViewer()', () => {
        const fakeFiles = [
            { ...fakeFileTemplate, extension: 'xlsx' },
            { ...fakeFileTemplate, extension: 'xlsm' },
            { ...fakeFileTemplate, extension: 'xlsb' },
        ];

        fakeFiles.forEach(fakeFile => {
            test('should choose the Office viewer if it is not disabled and the file is ok', () => {
                const viewer = OfficeLoader.determineViewer(fakeFile);
                expect(viewer).toEqual({
                    NAME: 'Office',
                    CONSTRUCTOR: OfficeViewer,
                    REP: 'ORIGINAL',
                    EXT: ['xlsx', 'xlsm', 'xlsb'],
                });
            });

            test('should choose the Office viewer if it is not disabled and the file is a shared link that is not password-protected', () => {
                const editedFakeFile = {
                    ...fakeFile,
                    shared_link: {
                        is_password_enabled: false,
                    },
                };
                const viewer = OfficeLoader.determineViewer(editedFakeFile);
                expect(viewer.NAME).toEqual('Office');
            });

            test('should not return a viewer if the Office viewer is disabled', () => {
                const viewer = OfficeLoader.determineViewer(fakeFile, ['Office']);
                expect(viewer).toBeUndefined();
            });

            test('should not return a viewer if the file is too large', () => {
                const editedFakeFile = { ...fakeFile, size: FIVE_MB + 1 };
                const viewer = OfficeLoader.determineViewer(editedFakeFile, []);
                expect(viewer).toBeUndefined();
            });

            test('should not return a viewer if the user does not have download permissions', () => {
                jest.spyOn(file, 'checkPermission').mockReturnValueOnce(false);
                const viewer = OfficeLoader.determineViewer(fakeFile, []);
                expect(viewer).toBeUndefined();
            });

            test('should not return a viewer if the file is a password-protected shared link', () => {
                const editedFakeFile = {
                    ...fakeFile,
                    shared_link: {
                        is_password_enabled: true,
                    },
                };
                const viewer = OfficeLoader.determineViewer(editedFakeFile, []);
                expect(viewer).toBeUndefined();
            });

            test('should respect maxFileSize in viewerOptions', () => {
                const viewerOptions = {
                    Office: {
                        maxFileSize: FIVE_MB + 1,
                    },
                };
                const editedFakeFile = { ...fakeFile, size: FIVE_MB + 1 };
                const viewer = OfficeLoader.determineViewer(editedFakeFile, [], viewerOptions);
                expect(viewer).toBeDefined();
            });
        });
    });
});
