/* eslint-disable no-unused-expressions */
import Cache from '../Cache';
import {
    getURL,
    getDownloadURL,
    isWatermarked,
    checkPermission,
    checkFeature,
    checkFileValid,
    cacheFile,
    uncacheFile,
    getRepresentation
} from '../file';

const sandbox = sinon.sandbox.create();

describe('lib/file', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('getURL()', () => {
        it('should return the correct api url', () => {
            assert.equal(
                getURL('id', 'api'),
                'api/2.0/files/id?fields=id,permissions,shared_link,sha1,file_version,name,size,extension,representations,watermark_info,authenticated_download_url'
            );
        });
    });

    describe('getDownloadURL()', () => {
        it('should return the correct api download url', () => {
            assert.equal(getDownloadURL('id', 'api'), 'api/2.0/files/id?fields=download_url');
        });
    });

    describe('isWatermarked()', () => {
        it('should return the correct values with null', () => {
            assert.notOk(isWatermarked());
        });
        it('should return the correct values with empty object', () => {
            assert.notOk(isWatermarked({}));
        });
        it('should return the correct values with no watermark info', () => {
            assert.notOk(isWatermarked({ watermark_info: {} }));
        });
        it('should return the correct values when not watermarked', () => {
            assert.notOk(isWatermarked({ watermark_info: { is_watermarked: false } }));
        });
        it('should return the correct values when watermarked', () => {
            assert.ok(isWatermarked({ watermark_info: { is_watermarked: true } }));
        });
    });

    describe('checkPermission()', () => {
        it('should return the correct values with nulls', () => {
            assert.notOk(checkPermission());
        });
        it('should return the correct values with empty objects', () => {
            assert.notOk(checkPermission({}, 'foo'));
        });
        it('should return the correct values with empty permissions', () => {
            assert.notOk(checkPermission({ permissions: {} }, 'foo'));
        });
        it('should return the correct values when not allowed', () => {
            assert.notOk(checkPermission({ permissions: { foo: false } }, 'foo'));
        });
        it('should return the correct values when allowed', () => {
            assert.ok(checkPermission({ permissions: { foo: true } }, 'foo'));
        });
    });

    describe('checkFeature()', () => {
        it('should return the correct values with nulls', () => {
            assert.notOk(checkFeature());
        });
        it('should return the correct values with empty object', () => {
            assert.notOk(checkFeature({}, 'foo'));
        });
        it('should return the correct values when feature exists', () => {
            assert.ok(checkFeature({ foo: sandbox.stub() }, 'foo'));
        });
        it('should return the correct values when feature exists and sub feature doesnt', () => {
            assert.notOk(checkFeature({ foo: sandbox.stub().returns(false) }, 'foo', 'bar'));
        });
        it('should return the correct values when feature and sub feature exist', () => {
            assert.ok(checkFeature({ foo: sandbox.stub().returns(true) }, 'foo', 'bar'));
        });
    });

    describe('checkFileValid()', () => {
        it('should return false if file is null or undefined or not an object', () => {
            let file = null;
            assert.notOk(checkFileValid(file));

            file = undefined;
            assert.notOk(checkFileValid(file));

            file = 'string';
            assert.notOk(checkFileValid(file));
        });

        it('should return true if file has all the appropratie properties', () => {
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
                authenticated_download_url: 'blah'
            };
            assert.ok(checkFileValid(file));
        });
    });

    describe('cacheFile', () => {
        it('should not cache file if it is watermarked', () => {
            const cache = {
                set: sandbox.stub()
            };
            const file = {
                watermark_info: {
                    is_watermarked: true
                }
            };

            cacheFile(cache, file);

            expect(cache.set).to.not.be.called;
        });

        it('should not add original representation if file object doesnt have any to start with', () => {
            const cache = {
                set: sandbox.stub()
            };
            const file = {
                id: '0'
            };

            cacheFile(cache, file);

            expect(file.representations).to.be.undefined;
        });

        it('should add an original rep and cache the file', () => {
            const cache = {
                set: sandbox.stub()
            };
            const file = {
                id: '0',
                representations: {
                    entries: []
                }
            };

            cacheFile(cache, file);

            expect(file.representations.entries[0].representation).to.equal('ORIGINAL');
            expect(cache.set).to.be.calledWith(file.id, file);
        });

        it('should not add an original rep if original rep already exists', () => {
            const cache = {
                set: sandbox.stub()
            };
            const file = {
                id: '0',
                representations: {
                    entries: [
                        {
                            representation: 'ORIGINAL'
                        }
                    ]
                }
            };

            cacheFile(cache, file);
            expect(file.representations.entries.length).to.equal(1);
        });

        it('should append file version to original rep content URL', () => {
            const cache = {
                set: sandbox.stub()
            };

            const file = {
                id: '0',
                file_version: {
                    id: '123'
                },
                representations: {
                    entries: []
                }
            };

            cacheFile(cache, file);
            expect(file.representations.entries[0].content.url_template).to.have.string('version=123');
        });
    });

    describe('uncacheFile', () => {
        it('should uncache a file', () => {
            const cache = new Cache();
            const file = {
                id: '0'
            };
            cache.set(file.id, file);

            uncacheFile(cache, file);

            expect(cache.get(file.id)).to.be.undefined;
        });
    });

    describe('getRepresentation', () => {
        it('should return null if no matching representation is found', () => {
            const file = {
                id: '0',
                representations: {
                    entries: []
                }
            };

            expect(getRepresentation(file, 'ORIGINAL')).to.be.null;
        });

        it('should return matching representation if found', () => {
            const originalRep = {
                representation: 'ORIGINAL'
            };
            const file = {
                id: '0',
                representations: {
                    entries: [originalRep]
                }
            };

            expect(getRepresentation(file, 'ORIGINAL')).to.be.equal(originalRep);
        });
    });
});
