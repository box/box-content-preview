/* eslint-disable no-unused-expressions */
import Image from '../image';
import * as util from '../../../util';

const CSS_CLASS_ZOOMABLE = 'zoomable';
const CSS_CLASS_PANNABLE = 'pannable';
const CSS_CLASS_PANNING = 'panning';

const sandbox = sinon.sandbox.create();
const imageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABWdVznAAAKQWlDQ1BJQ0MgUHJvZmlsZQAASA2dlndUU9kWh8+9N73QEiIgJfQaegkg0jtIFQRRiUmAUAKGhCZ2RAVGFBEpVmRUwAFHhyJjRRQLg4Ji1wnyEFDGwVFEReXdjGsJ7601896a/cdZ39nnt9fZZ+9917oAUPyCBMJ0WAGANKFYFO7rwVwSE8vE9wIYEAEOWAHA4WZmBEf4RALU/L09mZmoSMaz9u4ugGS72yy/UCZz1v9/kSI3QyQGAApF1TY8fiYX5QKUU7PFGTL/BMr0lSkyhjEyFqEJoqwi48SvbPan5iu7yZiXJuShGlnOGbw0noy7UN6aJeGjjAShXJgl4GejfAdlvVRJmgDl9yjT0/icTAAwFJlfzOcmoWyJMkUUGe6J8gIACJTEObxyDov5OWieAHimZ+SKBIlJYqYR15hp5ejIZvrxs1P5YjErlMNN4Yh4TM/0tAyOMBeAr2+WRQElWW2ZaJHtrRzt7VnW5mj5v9nfHn5T/T3IevtV8Sbsz55BjJ5Z32zsrC+9FgD2JFqbHbO+lVUAtG0GQOXhrE/vIADyBQC03pzzHoZsXpLE4gwnC4vs7GxzAZ9rLivoN/ufgm/Kv4Y595nL7vtWO6YXP4EjSRUzZUXlpqemS0TMzAwOl89k/fcQ/+PAOWnNycMsnJ/AF/GF6FVR6JQJhIlou4U8gViQLmQKhH/V4X8YNicHGX6daxRodV8AfYU5ULhJB8hvPQBDIwMkbj96An3rWxAxCsi+vGitka9zjzJ6/uf6Hwtcim7hTEEiU+b2DI9kciWiLBmj34RswQISkAd0oAo0gS4wAixgDRyAM3AD3iAAhIBIEAOWAy5IAmlABLJBPtgACkEx2AF2g2pwANSBetAEToI2cAZcBFfADXALDIBHQAqGwUswAd6BaQiC8BAVokGqkBakD5lC1hAbWgh5Q0FQOBQDxUOJkBCSQPnQJqgYKoOqoUNQPfQjdBq6CF2D+qAH0CA0Bv0BfYQRmALTYQ3YALaA2bA7HAhHwsvgRHgVnAcXwNvhSrgWPg63whfhG/AALIVfwpMIQMgIA9FGWAgb8URCkFgkAREha5EipAKpRZqQDqQbuY1IkXHkAwaHoWGYGBbGGeOHWYzhYlZh1mJKMNWYY5hWTBfmNmYQM4H5gqVi1bGmWCesP3YJNhGbjS3EVmCPYFuwl7ED2GHsOxwOx8AZ4hxwfrgYXDJuNa4Etw/XjLuA68MN4SbxeLwq3hTvgg/Bc/BifCG+Cn8cfx7fjx/GvyeQCVoEa4IPIZYgJGwkVBAaCOcI/YQRwjRRgahPdCKGEHnEXGIpsY7YQbxJHCZOkxRJhiQXUiQpmbSBVElqIl0mPSa9IZPJOmRHchhZQF5PriSfIF8lD5I/UJQoJhRPShxFQtlOOUq5QHlAeUOlUg2obtRYqpi6nVpPvUR9Sn0vR5Mzl/OX48mtk6uRa5Xrl3slT5TXl3eXXy6fJ18hf0r+pvy4AlHBQMFTgaOwVqFG4bTCPYVJRZqilWKIYppiiWKD4jXFUSW8koGStxJPqUDpsNIlpSEaQtOledK4tE20Otpl2jAdRzek+9OT6cX0H+i99AllJWVb5SjlHOUa5bPKUgbCMGD4M1IZpYyTjLuMj/M05rnP48/bNq9pXv+8KZX5Km4qfJUilWaVAZWPqkxVb9UU1Z2qbapP1DBqJmphatlq+9Uuq43Pp893ns+dXzT/5PyH6rC6iXq4+mr1w+o96pMamhq+GhkaVRqXNMY1GZpumsma5ZrnNMe0aFoLtQRa5VrntV4wlZnuzFRmJbOLOaGtru2nLdE+pN2rPa1jqLNYZ6NOs84TXZIuWzdBt1y3U3dCT0svWC9fr1HvoT5Rn62fpL9Hv1t/ysDQINpgi0GbwaihiqG/YZ5ho+FjI6qRq9Eqo1qjO8Y4Y7ZxivE+41smsImdSZJJjclNU9jU3lRgus+0zwxr5mgmNKs1u8eisNxZWaxG1qA5wzzIfKN5m/krCz2LWIudFt0WXyztLFMt6ywfWSlZBVhttOqw+sPaxJprXWN9x4Zq42Ozzqbd5rWtqS3fdr/tfTuaXbDdFrtOu8/2DvYi+yb7MQc9h3iHvQ732HR2KLuEfdUR6+jhuM7xjOMHJ3snsdNJp9+dWc4pzg3OowsMF/AX1C0YctFx4bgccpEuZC6MX3hwodRV25XjWuv6zE3Xjed2xG3E3dg92f24+ysPSw+RR4vHlKeT5xrPC16Il69XkVevt5L3Yu9q76c+Oj6JPo0+E752vqt9L/hh/QL9dvrd89fw5/rX+08EOASsCegKpARGBFYHPgsyCRIFdQTDwQHBu4IfL9JfJFzUFgJC/EN2hTwJNQxdFfpzGC4sNKwm7Hm4VXh+eHcELWJFREPEu0iPyNLIR4uNFksWd0bJR8VF1UdNRXtFl0VLl1gsWbPkRoxajCCmPRYfGxV7JHZyqffS3UuH4+ziCuPuLjNclrPs2nK15anLz66QX8FZcSoeGx8d3xD/iRPCqeVMrvRfuXflBNeTu4f7kufGK+eN8V34ZfyRBJeEsoTRRJfEXYljSa5JFUnjAk9BteB1sl/ygeSplJCUoykzqdGpzWmEtPi000IlYYqwK10zPSe9L8M0ozBDuspp1e5VE6JA0ZFMKHNZZruYjv5M9UiMJJslg1kLs2qy3mdHZZ/KUcwR5vTkmuRuyx3J88n7fjVmNXd1Z752/ob8wTXuaw6thdauXNu5Tnddwbrh9b7rj20gbUjZ8MtGy41lG99uit7UUaBRsL5gaLPv5sZCuUJR4b0tzlsObMVsFWzt3WazrWrblyJe0fViy+KK4k8l3JLr31l9V/ndzPaE7b2l9qX7d+B2CHfc3em681iZYlle2dCu4F2t5czyovK3u1fsvlZhW3FgD2mPZI+0MqiyvUqvakfVp+qk6oEaj5rmvep7t+2d2sfb17/fbX/TAY0DxQc+HhQcvH/I91BrrUFtxWHc4azDz+ui6rq/Z39ff0TtSPGRz0eFR6XHwo911TvU1zeoN5Q2wo2SxrHjccdv/eD1Q3sTq+lQM6O5+AQ4ITnx4sf4H++eDDzZeYp9qukn/Z/2ttBailqh1tzWibakNml7THvf6YDTnR3OHS0/m/989Iz2mZqzymdLz5HOFZybOZ93fvJCxoXxi4kXhzpXdD66tOTSna6wrt7LgZevXvG5cqnbvfv8VZerZ645XTt9nX297Yb9jdYeu56WX+x+aem172296XCz/ZbjrY6+BX3n+l37L972un3ljv+dGwOLBvruLr57/17cPel93v3RB6kPXj/Mejj9aP1j7OOiJwpPKp6qP6391fjXZqm99Oyg12DPs4hnj4a4Qy//lfmvT8MFz6nPK0a0RupHrUfPjPmM3Xqx9MXwy4yX0+OFvyn+tveV0auffnf7vWdiycTwa9HrmT9K3qi+OfrW9m3nZOjk03dp76anit6rvj/2gf2h+2P0x5Hp7E/4T5WfjT93fAn88ngmbWbm3/eE8/syOll+AAAA4klEQVQoFWNkQABG7QlvU/7/Z0xmYGTQBgv/Z7jKyPh/7tUC4TlA/n+QGCOI0Ox/LcnIwLKEkZHBCcRHB///M+z7z/An5nqh6HMmoCRQHapiN1VWhlZXLrg+kEEgNSC1LCBnABkoJvOyMTKIcoMtR9EEUsuo1f/uBCMjozlcBg/j////J5ngHkRS6KrCylDvxIkkAmUCAwPkBwygIszE4KDEiiEOEmACBtZVrDLYBIFqmUDhjE0OmxhILSgogB5/vwdXHMA0guLiWqGgC8gPQPafGJAATBKdhkUcSC1yYBOVNAAVx0qxuz8xqgAAAABJRU5ErkJggg==';
let image;
let stubs = {};
let imageParams;
let imageBlob;
let containerEl;
let clock;

/**
 * Creates and returns a blob from a base64 data URL
 *
 * @private
 * @param {string} dataURL The data URL to convert.
 * @returns {Blob} A blob representing the array buffer data.
 */
function dataURLToBlob(dataURL) {
    const parts = dataURL.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;

    const uInt8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], {
        type: contentType
    });
}

describe('image.js', () => {
    before(() => {
        fixture.setBase('src/lib');
        imageBlob = dataURLToBlob(imageUrl);
    });

    beforeEach(() => {
        clock = sinon.useFakeTimers();
        fixture.load('viewers/image/__tests__/image-test.html');
        containerEl = document.querySelector('.container');
        imageParams = {
            file: {
                id: '1',
                file_version: {
                    id: '1'
                },
                permissions: {
                    can_annotate: true,
                    can_delete: true
                }
            },
            viewerName: 'Image',
            viewers: {
                Image: {
                    annotations: false
                }
            }
        };
    });

    afterEach(() => {
        if (image && image.imageEl) {
            image.destroy();
        }
        stubs = {};

        sandbox.verifyAndRestore();
        fixture.cleanup();
        clock.restore();
    });

    describe('destroy()', () => {
        beforeEach(() => {
            image = new Image(containerEl, imageParams);
        });

        it('should destroy the annotator', () => {
            image.annotator = {
                removeAllListeners: sandbox.stub(),
                destroy: sandbox.stub()
            };

            image.destroy();

            expect(image.annotator.removeAllListeners).to.have.been.called;
            expect(image.annotator.destroy).to.have.been.called;
        });

        it('should remove all the listeners', () => {
            sandbox.stub(image, 'unbindDOMListeners');

            image.destroy();

            expect(image.unbindDOMListeners).to.have.been.called;
        });
    });

    describe('load()', () => {
        beforeEach(() => {
            image = new Image(containerEl, imageParams);
        });

        it('should fetch the image URL and load an image', () => {
            stubs.event = sandbox.stub(image.imageEl, 'addEventListener');
            stubs.load = sandbox.stub(image, 'onLoadHandler');
            stubs.fetch = sandbox.stub(image, 'fetchImageUrl');
            stubs.bind = sandbox.stub(image, 'bindDOMListeners');

            // load the image
            image.load(imageUrl);

            expect(stubs.event).to.have.been.calledWith('load', stubs.load);
            expect(stubs.fetch).to.have.been.called;
            expect(stubs.bind).to.have.been.called;
        });
    });

    describe('fetchImageUrl()', () => {
        beforeEach(() => {
            image = new Image(containerEl, imageParams);
            stubs.auth = sandbox.stub(image, 'appendAuthHeader');
        });

        it('should create the object url from image blob', () => {
            const promise = Promise.resolve(imageBlob);
            stubs.getImage = sandbox.stub(util, 'get').returns(promise);

            image.fetchImageUrl(imageUrl);
            expect(stubs.getImage).to.have.been.called;
            expect(stubs.auth).to.have.been.called;

            return promise.then(() => {
                expect(image.imageEl.src).to.not.equal('');
            });
        });
    });

    describe('updateCursor()', () => {
        beforeEach(() => {
            image = new Image(containerEl, imageParams);
        });

        it('should make the image pannable', () => {
            image.isZoomable = true;
            image.isPannable = true;
            image.imageEl.classList.add(CSS_CLASS_ZOOMABLE);

            image.updateCursor();

            expect(image.isZoomable).to.have.been.false;
            expect(image.imageEl.classList.contains(CSS_CLASS_PANNABLE)).to.have.been.true;
            expect(image.imageEl.classList.contains(CSS_CLASS_ZOOMABLE)).to.have.been.false;
        });

        it('should make the image zoomable', () => {
            image.isZoomable = false;
            image.isPannable = false;
            image.imageEl.classList.add(CSS_CLASS_PANNABLE);

            image.updateCursor();

            expect(image.isZoomable).to.have.been.true;
            expect(image.imageEl.classList.contains(CSS_CLASS_ZOOMABLE)).to.have.been.true;
            expect(image.imageEl.classList.contains(CSS_CLASS_PANNABLE)).to.have.been.false;
        });
    });

    describe('updatePannability()', () => {
        beforeEach(() => {
            image = new Image(containerEl, imageParams);
            stubs.cursor = sandbox.stub(image, 'updateCursor');
            image.didPan = true;
        });

        it('should ignore if image does not exist', () => {
            image.imageEl = null;

            image.updatePannability();

            expect(image.didPan).to.have.been.true;
            expect(stubs.cursor).to.not.be.called;
        });

        it('should ignore if in point annotation mode', () => {
            image.annotator = {
                isInPointMode: sandbox.stub().returns(true)
            };

            image.updatePannability();

            expect(image.annotator.isInPointMode).to.have.been.called;
            expect(image.didPan).to.have.been.true;
            expect(stubs.cursor).to.not.be.called;
        });

        it('should set pannability to true if rotated image is pannable', () => {
            image.annotator = {
                isInPointMode: sandbox.stub().returns(false)
            };
            sandbox.stub(image, 'isRotated').returns(true);

            image.imageEl.style.height = '50px';
            image.imageEl.style.width = '10px';
            image.wrapperEl.style.height = '10px';
            image.wrapperEl.style.width = '50px';

            image.updatePannability();
            expect(image.annotator.isInPointMode).to.have.been.called;
            expect(image.didPan).to.have.been.false;
            expect(stubs.cursor).to.have.been.called;
        });

        it('should set pannability to false if rotated image is not pannable', () => {
            image.annotator = {
                isInPointMode: sandbox.stub().returns(false)
            };
            sandbox.stub(image, 'isRotated').returns(true);

            image.imageEl.style.height = '10px';
            image.wrapperEl.style.height = '50px';
            image.imageEl.style.width = '10px';
            image.wrapperEl.style.width = '50px';

            image.updatePannability();

            expect(image.annotator.isInPointMode).to.have.been.called;
            expect(image.didPan).to.have.been.false;
            expect(stubs.cursor).to.have.been.called;
        });

        it('should set pannability to true if non-rotated image is pannable', () => {
            image.annotator = {
                isInPointMode: sandbox.stub().returns(false)
            };
            sandbox.stub(image, 'isRotated').returns(false);

            image.imageEl.style.height = '50px';
            image.wrapperEl.style.height = '10px';
            image.imageEl.style.width = '50px';
            image.wrapperEl.style.width = '10px';

            image.updatePannability();

            expect(image.annotator.isInPointMode).to.have.been.called;
            expect(image.didPan).to.have.been.false;
            expect(stubs.cursor).to.have.been.called;
        });

        it('should set pannability to false if non-rotated image is not pannable', () => {
            image.annotator = {
                isInPointMode: sandbox.stub().returns(false)
            };
            sandbox.stub(image, 'isRotated').returns(false);

            image.imageEl.style.height = '10px';
            image.wrapperEl.style.height = '50px';
            image.imageEl.style.width = '10px';
            image.wrapperEl.style.width = '50px';

            image.updatePannability();

            expect(image.annotator.isInPointMode).to.have.been.called;
            expect(image.didPan).to.have.been.false;
            expect(stubs.cursor).to.have.been.called;
        });
    });

    describe('pan()', () => {
        beforeEach(() => {
            image = new Image(containerEl, imageParams);
            stubs.emit = sandbox.stub(image, 'emit');
            image.didPan = false;
        });

        it('should pan to the given position', () => {
            image.isPanning = true;

            image.pan({});

            expect(image.didPan).to.be.true;
            expect(stubs.emit).to.have.been.calledWith('pan');
        });

        it('should not pan if the viewer is not already panning', () => {
            image.isPanning = false;

            image.pan({});

            expect(image.didPan).to.be.false;
            expect(stubs.emit).to.not.have.been.calledWith('pan');
        });
    });

    describe('stopPanning()', () => {
        it('should stop panning, remove listeners, and fire "panend" event', () => {
            image = new Image(containerEl, imageParams);
            image.isPanning = true;

            image.stopPanning();

            expect(image.isPanning).to.be.false;
        });
    });

    describe('startPanning()', () => {
        beforeEach(() => {
            image = new Image(containerEl, imageParams);
            stubs.emit = sandbox.stub(image, 'emit');
            stubs.pan = sandbox.stub(image, 'pan');
            stubs.stopPanning = sandbox.stub(image, 'stopPanning');
        });

        it('should not start panning if image is not pannable', () => {
            image.isPannable = false;
            image.isPanning = false;

            image.startPanning();

            expect(image.isPanning).to.be.false;
            expect(image.imageEl.classList.contains(CSS_CLASS_PANNING)).to.be.false;
            expect(image.emit).to.not.have.been.calledWith('panstart');
        });

        it('should start panning, remove listeners, and fire "panstart" event', () => {
            image.isPannable = true;
            image.isPanning = false;

            image.startPanning();

            expect(image.isPanning).to.be.true;
            expect(image.imageEl.classList.contains(CSS_CLASS_PANNING)).to.be.true;
            expect(image.emit).to.have.been.calledWith('panstart');
        });
    });

    describe('rotateLeft()', () => {
        beforeEach(() => {
            image = new Image(containerEl, imageParams);
            stubs.emit = sandbox.stub(image, 'emit');
            stubs.orientChange = sandbox.stub(image, 'handleOrientationChange');
            image.annotator = {
                renderAnnotations: sandbox.stub()
            };
            image.currentRotationAngle = 0;
        });

        it('should rotate the image 90 degrees to the left', () => {
            image.rotateLeft();

            expect(image.currentRotationAngle).to.equal(-90);
            expect(image.imageEl.getAttribute('data-rotation-angle')).to.equal('-90');
            expect(image.imageEl.style.transform).to.equal('rotate(-90deg)');
            expect(stubs.emit).to.have.been.calledWith('rotate');
            expect(stubs.orientChange).to.have.been.called;
        });

        it('should re-render annotations if annotator is initialized', () => {
            image.rotateLeft();

            expect(image.annotator.renderAnnotations).to.have.been.called;
        });
    });

    describe('zoom()', () => {
        beforeEach(() => {
            image = new Image(containerEl, imageParams);

            // Mock out fetch and return a blobbed image
            stubs.auth = sandbox.stub(image, 'appendAuthHeader');
            stubs.promise = Promise.resolve(imageBlob);
            stubs.getImage = sandbox.stub(util, 'get').returns(stubs.promise);
            sandbox.stub(image, 'onLoadHandler');

            // Set image height & width
            image.imageEl.style.width = '100px';
            image.imageEl.style.height = '100px';
        });

        it('should zoom in', () => {
            image.load(imageUrl);
            expect(stubs.getImage).to.have.been.called;
            expect(stubs.auth).to.have.been.called;

            return stubs.promise.then(() => {
                const origImageSize = image.imageEl.getBoundingClientRect();
                image.zoomIn();
                const newImageSize = image.imageEl.getBoundingClientRect();
                expect(newImageSize.width).gt(origImageSize.width);
            });
        });

        it('should zoom out', () => {
            image.load(imageUrl);
            expect(stubs.getImage).to.have.been.called;
            expect(stubs.auth).to.have.been.called;

            return stubs.promise.then(() => {
                const origImageSize = image.imageEl.getBoundingClientRect();
                image.zoomOut();
                const newImageSize = image.imageEl.getBoundingClientRect();
                expect(newImageSize.width).lt(origImageSize.width);
            });
        });
    });
});
