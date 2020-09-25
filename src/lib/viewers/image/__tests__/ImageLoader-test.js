/* eslint-disable no-unused-expressions */
import ImageLoader from '../ImageLoader';
import ImageViewer from '../ImageViewer';

describe('lib/viewers/image/ImageLoader', () => {
    describe('determineRepresentation()', () => {
        let file;
        let viewer;

        beforeEach(() => {
            file = {
                extension: 'jpg',
                representations: {
                    entries: [
                        {
                            representation: 'jpg',
                            properties: {
                                dimensions: '1024x1024',
                                paged: 'false',
                            },
                        },
                        {
                            representation: 'jpg',
                            properties: {
                                dimensions: '2048x2048',
                            },
                        },
                    ],
                },
            };

            viewer = {
                NAME: 'Image',
                CONSTRUCTOR: ImageViewer,
                REP: 'jpg',
                EXT: ['jpg'],
            };
        });

        test('it should not return the paged 1024x1024 representation', () => {
            const determinedRep = ImageLoader.determineRepresentation(file, viewer);
            expect(determinedRep.properties.dimensions).toBe('2048x2048');
        });
    });

    describe('determineViewer', () => {
        test('it should return the MultiImage viewer for a tif file with a jpg representation', () => {
            const file = {
                extension: 'tif',
                representations: {
                    entries: [
                        {
                            representation: 'jpg',
                            properties: {
                                dimensions: '1024x1024',
                                paged: 'false',
                            },
                        },
                        {
                            representation: 'jpg',
                            properties: {
                                dimensions: '2048x2048',
                                paged: 'true',
                            },
                        },
                    ],
                },
            };

            const determinedViewer = ImageLoader.determineViewer(file);
            expect(determinedViewer.NAME).toBe('MultiImage');
            expect(determinedViewer.REP).toBe('jpg');
        });

        test('it should return the MultiImage viewer for a tif file with a png representation', () => {
            const file = {
                extension: 'tif',
                representations: {
                    entries: [
                        {
                            representation: 'jpg',
                            properties: {
                                dimensions: '1024x1024',
                                paged: 'false',
                            },
                        },
                        {
                            representation: 'png',
                            properties: {
                                dimensions: '2048x2048',
                                paged: 'true',
                            },
                        },
                    ],
                },
            };

            const determinedViewer = ImageLoader.determineViewer(file);
            expect(determinedViewer.NAME).toBe('MultiImage');
            expect(determinedViewer.REP).toBe('png');
        });
    });
});
