import OfficeLoader from '../OfficeLoader';
import OfficeViewer from '../OfficeViewer';
import * as file from '../../../file';
import { PERMISSION_DOWNLOAD } from '../../../constants';

const sandbox = sinon.sandbox.create();

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

    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('determineViewer()', () => {
        const fakeFiles = [
            { ...fakeFileTemplate, extension: 'xlsx' },
            { ...fakeFileTemplate, extension: 'xlsm' },
            { ...fakeFileTemplate, extension: 'xlsb' },
        ];

        fakeFiles.forEach(fakeFile => {
            it('should choose the Office viewer if it is not disabled and the file is ok', () => {
                const viewer = OfficeLoader.determineViewer(fakeFile);
                expect(viewer).to.deep.equal({
                    NAME: 'Office',
                    CONSTRUCTOR: OfficeViewer,
                    REP: 'ORIGINAL',
                    EXT: ['xlsx', 'xlsm', 'xlsb'],
                });
            });

            it('should choose the Office viewer if it is not disabled and the file is a shared link that is not password-protected', () => {
                const editedFakeFile = fakeFile;
                editedFakeFile.shared_link = {
                    is_password_enabled: false,
                };
                const viewer = OfficeLoader.determineViewer(editedFakeFile);
                expect(viewer.NAME).to.equal('Office');
            });

            it('should not return a viewer if the Office viewer is disabled', () => {
                const viewer = OfficeLoader.determineViewer(fakeFile, ['Office']);
                expect(viewer).to.equal(undefined);
            });

            it('should not return a viewer if the file is too large', () => {
                const editedFakeFile = fakeFile;
                editedFakeFile.size = 5242881;
                const viewer = OfficeLoader.determineViewer(editedFakeFile, []);
                expect(viewer).to.equal(undefined);
            });

            it('should not return a viewer if the user does not have download permissions', () => {
                sandbox
                    .stub(file, 'checkPermission')
                    .withArgs(fakeFile, PERMISSION_DOWNLOAD)
                    .returns(false);
                const viewer = OfficeLoader.determineViewer(fakeFile, []);
                expect(viewer).to.equal(undefined);
            });

            it('should not return a viewer if the file is a password-protected shared link', () => {
                const editedFakeFile = fakeFile;
                editedFakeFile.shared_link = {
                    is_password_enabled: true,
                };
                const viewer = OfficeLoader.determineViewer(editedFakeFile, []);
                expect(viewer).to.equal(undefined);
            });
        });
    });
});
