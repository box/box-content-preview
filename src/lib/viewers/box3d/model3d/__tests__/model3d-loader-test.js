/* eslint-disable no-unused-expressions */
import Model3dLoader from '../model3d-loader';
import Browser from '../../../../Browser';

const sandbox = sinon.sandbox.create();

describe('model3d-loader', () => {
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
            expect(() => Model3dLoader.determineViewer(file)).to.throw(Error, /browser doesn't support preview for 3D models/);
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
            expect(Model3dLoader.determineViewer(file)).to.equal(Model3dLoader.viewers[0]);
        });
    });
});
