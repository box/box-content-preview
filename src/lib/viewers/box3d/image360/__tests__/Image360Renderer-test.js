/* eslint-disable no-unused-expressions */
import Image360Renderer from '../Image360Renderer';
import sceneEntities from '../SceneEntities';

const sandbox = sinon.sandbox.create();

describe('lib/viewers/box3d/image360/Image360Renderer', () => {
    let containerEl;
    let renderer;

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/box3d/image360/__tests__/Image360Renderer-test.html');
        containerEl = document.querySelector('.container');
        renderer = new Image360Renderer(containerEl, {});
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        if (renderer && typeof renderer.destroy === 'function') {
            renderer.destroy();
        }

        renderer = null;
    });

    describe('constructor()', () => {
        it('should create a null variable called .textureAsset', () => {
            expect(renderer.textureAsset).to.be.null;
        });

        it('should create a null variable called .imageAsset', () => {
            expect(renderer.imageAsset).to.be.null;
        });

        it('should create a null variable called .skybox', () => {
            expect(renderer.skybox).to.be.null;
        });
    });

    describe('destroy()', () => {
        it('should call cleanupTexture()', () => {
            const stub = sandbox.stub(renderer, 'cleanupTexture');
            renderer.destroy();

            expect(stub).to.be.called;
        });

        it('should invoke imageAsset.destroy(), if it exists', () => {
            renderer.imageAsset = {
                destroy: sandbox.stub()
            };
            const imageAsset = renderer.imageAsset;
            renderer.destroy();

            expect(imageAsset.destroy).to.be.called;
        });
    });

    describe('cleanupTexture()', () => {
        beforeEach(() => {
            renderer.box3d = {};
        });

        afterEach(() => {
            renderer.box3d = null;
        });

        it('should do nothing if .box3d does not exist', () => {
            sandbox.stub(renderer, 'getSkyboxComponent');
            renderer.box3d = null;
            renderer.cleanupTexture();

            expect(renderer.getSkyboxComponent).to.not.be.called;
        });

        it('should invoke textureAsset.destroy()', () => {
            renderer.textureAsset = {
                destroy: sandbox.stub()
            };
            const textureAsset = renderer.textureAsset;

            sandbox.stub(renderer, 'getSkyboxComponent');
            renderer.cleanupTexture();

            expect(textureAsset.destroy).to.be.called;
        });

        it('should nullify textureAsset if it exists', () => {
            renderer.textureAsset = {
                destroy: sandbox.mock()
            };

            sandbox.stub(renderer, 'getSkyboxComponent');
            renderer.cleanupTexture();

            expect(renderer.textureAsset).to.not.exist;
        });

        it('should set "skyboxTexture" attribute to null, if skybox component exists on the scene', () => {
            const skybox = {
                setAttribute: sandbox.stub()
            };
            renderer.skybox = skybox;
            sandbox.stub(renderer, 'getSkyboxComponent').returns(skybox);
            renderer.cleanupTexture();

            expect(skybox.setAttribute).to.be.calledWith('skyboxTexture', null);
        });
    });

    describe('getSkyboxComponent()', () => {
        it('should return the .skybox instance if available', () => {
            const skybox = {
                name: 'skybox',
                setAttribute: sandbox.stub()
            };

            renderer.skybox = skybox;

            const skyboxComponent = renderer.getSkyboxComponent();

            expect(skyboxComponent).to.deep.equal(skybox);
        });

        it('should should not attempt to get skybox_renderer component if .skybox exists', () => {
            const skybox = {
                name: 'skybox',
                setAttribute: sandbox.stub()
            };
            renderer.skybox = skybox;

            renderer.box3d = {
                getEntityById: sandbox.stub()
            };

            renderer.getSkyboxComponent();

            expect(renderer.box3d.getEntityById).to.not.be.called;
            renderer.box3d = null;
            renderer.skybox = null;
        });

        it('should should get skybox_renderer component from scene if .skybox doesn\'t exists', () => {
            const skybox = {
                name: 'skybox',
                setAttribute: sandbox.stub()
            };

            const scene = {
                getComponentByScriptId: sandbox.stub().returns(skybox)
            };

            renderer.box3d = {
                getEntityById: sandbox.stub().returns(scene)
            };

            renderer.getSkyboxComponent();

            expect(renderer.box3d.getEntityById).to.be.called;
            renderer.box3d = null;
            renderer.skybox = null;
        });
    });

    describe('load()', () => {
        it('should use sceneEntities value if provided for initialization', (done) => {
            const mySceneEntities = {
                light: 'light',
                camera: 'camera',
                action: ':D'
            };

            sandbox.stub(renderer, 'initBox3d', (options) => {
                expect(options.sceneEntities).to.deep.equal(mySceneEntities);
                done();
                return new Promise(() => {});
            });

            renderer.load('', { sceneEntities: mySceneEntities });
        });

        it('should use default sceneEntities, if none provided, for initialization', (done) => {
            sandbox.stub(renderer, 'initBox3d', (options) => {
                expect(options.sceneEntities).to.deep.equal(sceneEntities);
                done();
                return new Promise(() => {});
            });

            renderer.load('');
        });

        it('should use provided inputSettings for initialization', (done) => {
            const myInputSettings = {
                mouse_control: true,
                left_click: 'probably',
                right_click: true,
                middle_click: 'always'
            };

            sandbox.stub(renderer, 'initBox3d', (options) => {
                expect(options.inputSettings).to.deep.equal(myInputSettings);
                done();
                return new Promise(() => {});
            });

            renderer.load('', { inputSettings: myInputSettings });
        });

        it('should call initBox3d() with the passed in options object', (done) => {
            const myOptions = {
                inputSettings: { some: 'stuff' },
                sceneSettings: { more: 'stuff' },
                even: { more: 'things' }
            };

            sandbox.stub(renderer, 'initBox3d', (options) => {
                expect(options).to.deep.equal(myOptions);
                done();
                return new Promise(() => {});
            });

            renderer.load('', myOptions);
        });

        it('should call loadPanoramaFile() with url for box3d representation', (done) => {
            const fileUrl = 'I/am/a/url';

            sandbox.stub(renderer, 'initBox3d').returns(Promise.resolve());
            sandbox.stub(renderer, 'loadPanoramaFile', (url) => {
                expect(url).to.equal(fileUrl);
                done();
                return new Promise(() => {});
            });

            renderer.load(fileUrl);
        });

        it('should call onSceneLoad() when done loading file', (done) => {
            sandbox.stub(renderer, 'initBox3d').returns(Promise.resolve());
            sandbox.stub(renderer, 'loadPanoramaFile').returns(Promise.resolve());
            sandbox.stub(renderer, 'onSceneLoad', () => {
                done();
            });

            renderer.load();
        });
    });

    describe('loadPanoramaFile()', () => {
        it('should have @jholdstock implement this test after @mbond gets 3D image representations in prod');
    });

    describe('enableVr()', () => {
        beforeEach(() => {
            // We don't care about super calls :D
            Object.defineProperty(Object.getPrototypeOf(Image360Renderer.prototype), 'enableVr', {
                value: sandbox.stub()
            });
        });

        it('should invoke .skybox.setAttribute()', () => {
            const spy = sandbox.spy();

            const skybox = {
                setAttribute: spy
            };

            renderer.skybox = skybox;

            renderer.enableVr();

            expect(spy).to.be.called;
            renderer.skybox = null;
        });

        it('should invoke .skybox.setAttribute() with arguments "stereoEnabled" and true', () => {
            const spy = sandbox.spy();

            const skybox = {
                setAttribute: spy
            };

            renderer.skybox = skybox;

            renderer.enableVr();

            expect(spy.calledWith('stereoEnabled', true)).to.be.true;
            renderer.skybox = null;
        });
    });

    describe('disableVr()', () => {
        beforeEach(() => {
            // We don't care about super calls :D
            Object.defineProperty(Object.getPrototypeOf(Image360Renderer.prototype), 'disableVr', {
                value: sandbox.stub()
            });
        });

        it('should call .skybox.setAttribute()', () => {
            const spy = sandbox.spy();

            const skybox = {
                setAttribute: spy
            };

            renderer.skybox = skybox;

            renderer.disableVr();

            expect(spy).to.be.called;
            renderer.skybox = null;
        });

        it('should call .skybox.setAttribute() with arguments "stereoEnabled" and false', () => {
            const spy = sandbox.spy();

            const skybox = {
                setAttribute: spy
            };

            renderer.skybox = skybox;

            renderer.disableVr();

            expect(spy.calledWith('stereoEnabled', false)).to.be.true;
            renderer.skybox = null;
        });
    });
});
