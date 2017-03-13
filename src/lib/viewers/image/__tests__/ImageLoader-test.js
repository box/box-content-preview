/* eslint-disable no-unused-expressions */
import ImageLoader from '../ImageLoader';
import Image from '../Image';

const sandbox = sinon.sandbox.create();

describe('lib/viewers/image/ImageLoader', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('determineRepresentation()', () => {
        let file;
        let viewer;

        beforeEach(() => {
            file = {
                extension: 'jpg',
                representations: {
                    entries: [{
                        representation: 'jpg',
                        properties: {
                            dimensions: '1024x1024',
                            paged: 'false'
                        }
                    }, {
                        representation: 'jpg',
                        properties: {
                            dimensions: '2048x2048'
                        }
                    }]
                }
            };

            viewer = {
                NAME: 'Image',
                CONSTRUCTOR: Image,
                REP: 'jpg',
                EXT: ['jpg']
            };
        });

        it('it should not return the paged 1024x1024 representation', () => {
            const determinedRep = ImageLoader.determineRepresentation(file, viewer);
            expect(determinedRep.properties.dimensions).to.equal('2048x2048');
        });
    });
});
