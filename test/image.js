//import sinon from 'sinon';
import Image from '../src/image';

let sandbox = sinon.sandbox.create();
let imageUrl = 'http://youngjournalistacademy.com/wp-content/uploads/2015/04/tai-x-wing.jpg';
let image;

describe('image', () => {

    before(function() {
        fixture.setBase('test')
    });

    beforeEach(() => {
        fixture.load('image.html');
        image = new Image('.container');
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();
    });

    it('should load', () => {
        return image.load(imageUrl).should.be.fulfilled;
    });

    it('should not load and timeout', function() {
        this.timeout(6000);
        return image.load('/foo/bar').should.be.rejected;
    });

    it('should zoom in', (done) => {
        image.load(imageUrl).then(() => {
            let imageEl = document.querySelector('.box-preview-image img');
            let origImageSize = imageEl.getBoundingClientRect();
            image.zoomIn();
            let newImageSize = imageEl.getBoundingClientRect();
            assert.ok(newImageSize.width > origImageSize.width);
            done();
        }).catch((error) => {
            done(error);
        });
    });

    it('should zoom out', (done) => {
        image.load(imageUrl).then(() => {
            let imageEl = document.querySelector('.box-preview-image img');
            let origImageSize = imageEl.getBoundingClientRect();
            image.zoomOut();
            let newImageSize = imageEl.getBoundingClientRect();
            assert.ok(newImageSize.width < origImageSize.width);
            done();
        }).catch((error) => {
            done(error);
        });
    });
});