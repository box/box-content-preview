/* eslint-disable no-unused-expressions */
import Cache from '../Cache';
import Browser from '../Browser';
import {
    getURL,
    getDownloadURL,
    isWatermarked,
    checkPermission,
    checkFeature,
    checkFileValid,
    cacheFile,
    uncacheFile,
    getRepresentation,
    normalizeFileVersion,
    getCachedFile,
    isVeraProtectedFile,
    canDownload,
    shouldDownloadWM,
} from '../file';

describe('lib/file', () => {
    describe('getURL()', () => {
        test('should return the correct api url', () => {
            expect(getURL('id', '', 'api')).toEqual(
                'api/2.0/files/id?fields=id,permissions,shared_link,sha1,file_version,name,size,extension,representations,watermark_info,authenticated_download_url,is_download_available',
            );
        });

        test('should return the correct API url for file version', () => {
            expect(getURL('id', 'versionId', 'api')).toEqual(
                'api/2.0/files/id/versions/versionId?fields=id,permissions,shared_link,sha1,file_version,name,size,extension,representations,watermark_info,authenticated_download_url,is_download_available',
            );
        });
    });

    describe('getDownloadURL()', () => {
        test('should return the correct api download url', () => {
            expect(getDownloadURL('id', 'api')).toEqual('api/2.0/files/id?fields=download_url');
        });
    });

    describe('isWatermarked()', () => {
        test('should return the correct values with null', () => {
            expect(isWatermarked()).toBeFalsy();
        });
        test('should return the correct values with empty object', () => {
            expect(isWatermarked({})).toBeFalsy();
        });
        test('should return the correct values with no watermark info', () => {
            expect(isWatermarked({ watermark_info: {} })).toBeFalsy();
        });
        test('should return the correct values when not watermarked', () => {
            expect(isWatermarked({ watermark_info: { is_watermarked: false } })).toBeFalsy();
        });
        test('should return the correct values when watermarked', () => {
            expect(isWatermarked({ watermark_info: { is_watermarked: true } })).toBeTruthy();
        });
    });

    describe('checkPermission()', () => {
        test('should return the correct values with nulls', () => {
            expect(checkPermission()).toBeFalsy();
        });
        test('should return the correct values with empty objects', () => {
            expect(checkPermission({}, 'foo')).toBeFalsy();
        });
        test('should return the correct values with empty permissions', () => {
            expect(checkPermission({ permissions: {} }, 'foo')).toBeFalsy();
        });
        test('should return the correct values when not allowed', () => {
            expect(checkPermission({ permissions: { foo: false } }, 'foo')).toBeFalsy();
        });
        test('should return the correct values when allowed', () => {
            expect(checkPermission({ permissions: { foo: true } }, 'foo')).toBeTruthy();
        });
    });

    describe('checkFeature()', () => {
        test('should return the correct values with nulls', () => {
            expect(checkFeature()).toBeFalsy();
        });
        test('should return the correct values with empty object', () => {
            expect(checkFeature({}, 'foo')).toBeFalsy();
        });
        test('should return the correct values when feature exists', () => {
            expect(checkFeature({ foo: jest.fn() }, 'foo')).toBeTruthy();
        });
        test('should return the correct values when feature exists and sub feature doesnt', () => {
            expect(checkFeature({ foo: jest.fn(() => false) }, 'foo', 'bar')).toBeFalsy();
        });
        test('should return the correct values when feature and sub feature exist', () => {
            expect(checkFeature({ foo: jest.fn(() => true) }, 'foo', 'bar')).toBeTruthy();
        });
    });

    describe('checkFileValid()', () => {
        test('should return false if file is null or undefined or not an object', () => {
            let file = null;
            expect(checkFileValid(file)).toBeFalsy();

            file = undefined;
            expect(checkFileValid(file)).toBeFalsy();

            file = 'string';
            expect(checkFileValid(file)).toBeFalsy();
        });

        test('should return true if file has all the appropratie properties', () => {
            const file = {
                id: '123',
                permissions: {},
                shared_link: 'blah',
                sha1: 'blah',
                file_version: 'blah',
                name: 'blah',
                size: 'blah',
                extension: 'blah',
                representations: {},
                watermark_info: {},
                authenticated_download_url: 'blah',
                is_download_available: true,
            };
            expect(checkFileValid(file)).toBeTruthy();
        });
    });

    describe('normalizeFileVersion', () => {
        test('should return a well-formed file object', () => {
            const fileId = '123';
            const fileVersion = {
                id: 'file_version_123',
                permissions: {},
                sha1: 'blah',
                name: 'harhar',
                size: 123,
                extension: 'exe',
                representations: {},
                watermark_info: {},
                authenticated_download_url: 'blah?version=file_version_123',
                is_download_available: true,
            };

            const file = normalizeFileVersion(fileVersion, fileId);
            expect(checkFileValid(file)).toBeTruthy();

            expect(file.id).toBe(fileId);
            expect(file.file_version.id).toBe(fileVersion.id);
        });
    });

    describe('cacheFile', () => {
        let cache;

        beforeEach(() => {
            cache = {
                set: jest.fn(),
            };
        });

        test('should not cache file if it is watermarked', () => {
            const file = {
                watermark_info: {
                    is_watermarked: true,
                },
            };

            cacheFile(cache, file);

            expect(cache.set).not.toBeCalled();
        });

        test('should not add original representation if file object doesnt have any to start with', () => {
            const file = {
                id: '0',
            };

            cacheFile(cache, file);

            expect(file.representations).toBeUndefined();
        });

        test('should add an original rep and cache the file', () => {
            const file = {
                id: '0',
                representations: {
                    entries: [],
                },
            };

            cacheFile(cache, file);

            expect(file.representations.entries[0].representation).toBe('ORIGINAL');
            expect(cache.set).toBeCalledWith(`file_${file.id}`, file);
        });

        test('should not add an original rep if original rep already exists', () => {
            const file = {
                id: '0',
                representations: {
                    entries: [
                        {
                            representation: 'ORIGINAL',
                        },
                    ],
                },
            };

            cacheFile(cache, file);
            expect(file.representations.entries.length).toBe(1);
        });

        test('should append file version to original rep content URL', () => {
            cache = {
                set: jest.fn(),
            };

            const file = {
                id: '0',
                file_version: {
                    id: '123',
                },
                representations: {
                    entries: [],
                },
            };

            cacheFile(cache, file);
            expect(file.representations.entries[0].content.url_template).toContain('version=123');
        });

        test('should additionally cache file by file version ID if file version exists on file', () => {
            const file = {
                id: '123',
                file_version: {
                    id: '1234',
                },
            };

            cacheFile(cache, file);
            expect(cache.set).toBeCalledWith(`file_${file.id}`, file);
            expect(cache.set).toBeCalledWith(`file_version_${file.file_version.id}`, file);
        });
    });

    describe('uncacheFile', () => {
        test('should uncache a file', () => {
            const cache = new Cache();
            const file = {
                id: '0',
                file_version: {
                    id: '123',
                },
            };
            cache.set(file.id, file);

            uncacheFile(cache, file);

            expect(cache.get(`file_${file.id}`)).toBeUndefined();
            expect(cache.get(`file_version_${file.file_version.id}`)).toBeUndefined();
        });
    });

    describe('getRepresentation', () => {
        test('should return null if no matching representation is found', () => {
            const file = {
                id: '0',
                representations: {
                    entries: [],
                },
            };

            expect(getRepresentation(file, 'ORIGINAL')).toBeNull();
        });

        test('should return matching representation if found', () => {
            const originalRep = {
                representation: 'ORIGINAL',
            };
            const file = {
                id: '0',
                representations: {
                    entries: [originalRep],
                },
            };

            expect(getRepresentation(file, 'ORIGINAL')).toBe(originalRep);
        });
    });

    describe('getCachedFile', () => {
        let cache;

        beforeEach(() => {
            cache = {
                get: jest.fn(),
            };
        });

        test('should return cached file using file ID as the key if file ID is provided', () => {
            const fileId = '123';
            getCachedFile(cache, { fileId });
            expect(cache.get).toBeCalledWith(`file_${fileId}`);
        });

        test('should return cached file using file version ID as the key if both file ID and file version ID are provided', () => {
            const fileId = '123';
            const fileVersionId = '1234';
            getCachedFile(cache, { fileId, fileVersionId });
            expect(cache.get).toBeCalledWith(`file_version_${fileVersionId}`);
        });

        test('should return cached file using file version ID as the key if file version ID is provided', () => {
            const fileVersionId = '1234';
            getCachedFile(cache, { fileVersionId });
            expect(cache.get).toBeCalledWith(`file_version_${fileVersionId}`);
        });

        test('should null if neither file ID nor file version ID is provided', () => {
            getCachedFile(cache, {});
            expect(cache.get).not.toBeCalled();
        });
    });

    describe('isVeraProtectedFile()', () => {
        ['some.vera.pdf.html', '.vera.test.html', 'blah.vera..html', 'another.vera.3.html', 'test.vera.html'].forEach(
            fileName => {
                test('should return true if file is named like a Vera-protected file', () => {
                    expect(isVeraProtectedFile({ name: fileName })).toBe(true);
                });
            },
        );

        ['vera.pdf.html', 'test.vera1.pdf.html', 'blah.vera..htm', 'another.verahtml'].forEach(fileName => {
            test('should return false if file is not named like a Vera-protected file', () => {
                expect(isVeraProtectedFile({ name: fileName })).toBe(false);
            });
        });
    });

    describe('shouldDownloadWM()', () => {
        [
            [false, false, false],
            [false, true, false],
            [true, true, true],
            [true, false, false],
        ].forEach(([downloadWM, isFileWatermarked, expected]) => {
            test('should return whether we should download the watermarked representation or original file', () => {
                const previewOptions = { downloadWM };
                const file = {
                    watermark_info: {
                        is_watermarked: isFileWatermarked,
                    },
                };

                expect(shouldDownloadWM(file, previewOptions)).toBe(expected);
            });
        });
    });

    describe('canDownload()', () => {
        let file;
        let options;

        beforeEach(() => {
            file = {
                is_download_available: false,
                permissions: {
                    can_download: false,
                    can_preview: false,
                },
                watermark_info: {
                    is_watermarked: false,
                },
            };
            options = {
                showDownload: false,
            };
        });

        [
            // Can download original
            [false, false, false, false, false, false, false, false],
            [false, false, false, true, false, false, false, false],
            [false, false, true, false, false, false, false, false],
            [false, true, false, false, false, false, false, false],
            [true, false, false, false, false, false, false, false],
            [true, true, true, true, false, false, false, true],

            // Can download watermarked (don't need download permission)
            [true, true, false, true, true, false, false, false],
            [true, true, false, true, true, true, false, false],
            [true, true, false, true, true, true, true, true],
        ].forEach(
            ([
                isDownloadable,
                isDownloadEnabled, // eslint-disable-line no-unused-vars
                hasDownloadPermission,
                isBrowserSupported,
                hasPreviewPermission,
                isFileWatermarked,
                downloadWM,
                expectedResult,
            ]) => {
                test('should return true if original or watermarked file can be downloaded', () => {
                    file.permissions.can_download = hasDownloadPermission;
                    file.permissions.can_preview = hasPreviewPermission;
                    file.is_download_available = isDownloadable;
                    file.watermark_info.is_watermarked = isFileWatermarked;
                    options.showDownload = isDownloadable;
                    options.downloadWM = downloadWM;
                    jest.spyOn(Browser, 'canDownload').mockReturnValue(isBrowserSupported);

                    expect(canDownload(file, options)).toBe(expectedResult);
                });
            },
        );
    });
});
