/* eslint-disable no-unused-expressions */
import Model3DLoader from '../Model3DLoader';
import Browser from '../../../../Browser';

const sandbox = sinon.sandbox.create();

describe('lib/viewers/box3d/model3d/Model3DLoader', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('determineViewer()', () => {
        it('should throw an error if browser doesn\'t support 3D', () => {
            const file = {
                extension: 'box3d',
                name: 'blah.box3d',
                representations: {
                    entries: [{
                        representation: '3d'
                    }]
                }
            };

            sandbox.stub(Browser, 'supportsModel3D').returns(false);
            expect(() => Model3DLoader.determineViewer(file)).to.throw(Error, /browser doesn't support preview for 3D models/);
        });

        it('should return viewer if browser supports 3D', () => {
            const file = {
                extension: 'box3d',
                name: 'blah.box3d',
                representations: {
                    entries: [{
                        representation: '3d'
                    }]
                }
            };

            sandbox.stub(Browser, 'supportsModel3D').returns(true);
            expect(Model3DLoader.determineViewer(file)).to.equal(Model3DLoader.viewers[0]);
        });
    });
});
