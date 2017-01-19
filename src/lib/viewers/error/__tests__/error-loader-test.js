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
                REP: 'ORIGINAL',
                EXT: [],
                JS: ['error.js'],
                CSS: ['error.css'],
                NAME: 'PreviewError'
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
