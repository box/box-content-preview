/* eslint-disable no-unused-expressions */
import ErrorLoader from '../error-loader';

const sandbox = sinon.sandbox.create();

describe('error-loader', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('constructor()', () => {
        it('should have the correct viewer', () => {
            expect(ErrorLoader.viewers[0]).to.deep.equal({
                REPRESENTATION: 'ORIGINAL',
                EXTENSIONS: [],
                SCRIPTS: ['error.js'],
                STYLESHEETS: ['error.css'],
                CONSTRUCTOR: 'PreviewError'
            });
        });
    });

    describe('canLoad()', () => {
        it('should return true', () => {
            expect(ErrorLoader.canLoad()).to.be.true;
        });
    });

    describe('determineViewer()', () => {
        it('should return the single error viewer', () => {
            expect(ErrorLoader.determineViewer()).to.equal(ErrorLoader.viewers[0]);
        });
    });
});
