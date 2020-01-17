/* eslint-disable no-unused-expressions */
import AssetLoader from '../AssetLoader';

let loader;

describe('lib/viewers/AssetLoader', () => {
    beforeEach(() => {
        loader = new AssetLoader();
    });

    afterEach(() => {
        if (typeof loader.destroy === 'function') {
            loader.destroy();
        }

        loader = null;
    });

    describe('canLoad()', () => {
        test('should return true if loader can find a viewer to match the file', () => {
            jest.spyOn(loader, 'determineViewer').mockReturnValue({});

            expect(loader.canLoad({}, [], { viewer: {} })).toBe(true);
            expect(loader.determineViewer).toBeCalledWith({}, [], { viewer: {} });
        });

        test("should return false if loader can't find a viewer to match the file", () => {
            jest.spyOn(loader, 'determineViewer').mockReturnValue(null);

            expect(loader.canLoad({}, [], { viewer: {} })).toBe(false);
            expect(loader.determineViewer).toBeCalledWith({}, [], { viewer: {} });
        });
    });

    describe('getViewers()', () => {
        test("should return the loader's viewers", () => {
            loader.viewers = [{}, {}];

            expect(loader.getViewers()).toBe(loader.viewers);
        });

        test("should return an empty array if the loader doesn't have viewers", () => {
            expect(loader.getViewers()).toEqual([]);
        });
    });

    describe('determineViewer()', () => {
        beforeEach(() => {
            loader.viewers = [
                {
                    NAME: 'Adobe',
                    REP: 'pdf',
                    EXT: ['pdf'],
                },
                {
                    NAME: 'Document',
                    REP: 'ORIGINAL',
                    EXT: ['pdf'],
                },
                {
                    NAME: 'SomeOtherPDFViewer',
                    REP: 'pdf',
                    EXT: ['pdf'],
                },
            ];
        });

        test('should choose the first viewer that matches by extension and representation', () => {
            const file = {
                extension: 'pdf',
                representations: {
                    entries: [
                        {
                            representation: 'pdf',
                        },
                    ],
                },
            };

            const viewer = loader.determineViewer(file);
            expect(viewer.NAME).toBe('Adobe');
        });

        test('should not choose a disabled viewer and instead choose the next matching viewer', () => {
            const file = {
                extension: 'pdf',
                representations: {
                    entries: [
                        {
                            representation: 'ORIGINAL',
                        },
                        {
                            representation: 'pdf',
                        },
                    ],
                },
            };

            const viewer = loader.determineViewer(file, ['Adobe']);
            expect(viewer.NAME).toBe('Document');
        });

        test('should not return a viewer if no matching viewer is found', () => {
            const file = {
                extension: 'mp3',
                representations: {
                    entries: [
                        {
                            representation: 'ORIGINAL',
                        },
                        {
                            representation: 'mp3',
                        },
                    ],
                },
            };

            const viewer = loader.determineViewer(file, ['Adobe']);
            expect(viewer).toBeUndefined();
        });
    });

    describe('determineRepresentation()', () => {
        const file = {
            representations: {
                entries: [
                    {
                        representation: 'ORIGINAL',
                    },
                    {
                        representation: 'pdf',
                    },
                ],
            },
        };

        test('should return a representation based on the file and viewer', () => {
            const viewer = {
                REP: 'pdf',
            };

            const representation = loader.determineRepresentation(file, viewer);
            expect(representation.representation).toBe('pdf');
        });

        test('should not return a representation if there is no match', () => {
            const viewer = {
                REP: 'xlsx',
            };

            const representation = loader.determineRepresentation(file, viewer);
            expect(representation).toBeUndefined();
        });
    });
});
