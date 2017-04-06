/* eslint-disable no-unused-expressions */
import Model3DLoader from '../Model3DLoader';
import Browser from '../../../../Browser';

const sandbox = sinon.sandbox.create();
let file;
describe('lib/viewers/box3d/model3d/Model3DLoader', () => {
    beforeEach(() => {
        file = {
            extension: 'box3d',
            name: 'blah.box3d',
            representations: {
                entries: [{
                    representation: '3d'
                }]
            }
        };
    });

    afterEach(() => {
        file = undefined;
        sandbox.verifyAndRestore();
    });

    describe('determineViewer()', () => {
        it('should throw an error if browser doesn\'t support 3D and it is a 3d file', () => {
            sandbox.stub(Browser, 'supportsModel3D').returns(false);
            expect(() => Model3DLoader.determineViewer(file)).to.throw(Error, /browser doesn't support preview for 3D models/);
        });

        it('should not throw an error if browser doesn\'t support 3D and it is a non 3d file', () => {
            file = {
                extension: 'pdf',
                name: 'blah.pdf',
                representations: {
                    entries: [{
                        representation: 'pdf'
                    }]
                }
            };

            sandbox.stub(Browser, 'supportsModel3D').returns(false);
            expect(() => Model3DLoader.determineViewer(file)).to.not.throw(Error, /browser doesn't support preview for 3D models/);
        });

        it('should return viewer if browser supports 3D', () => {
            sandbox.stub(Browser, 'supportsModel3D').returns(true);
            expect(Model3DLoader.determineViewer(file)).to.equal(Model3DLoader.viewers[0]);
        });
    });
});
