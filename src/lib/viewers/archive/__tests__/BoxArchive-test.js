/* eslint-disable no-unused-expressions */
import ReactDOM from 'react-dom';
import BoxArchive from '../BoxArchive';

const sandbox = sinon.sandbox.create();
let archiveComponent;
let containerEl;

describe('lib/viewers/archive/BoxArchive', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/archive/__tests__/BoxArchive-test.html');
        containerEl = document.querySelector('.container');
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        if (archiveComponent && typeof archiveComponent.destroy === 'function') {
            archiveComponent.destroy();
        }
        archiveComponent = null;
    });

    describe('destroy()', () => {
        it('should unmount the component', () => {
            sandbox.stub(ReactDOM, 'render').returns({});
            sandbox.stub(ReactDOM, 'unmountComponentAtNode');
            archiveComponent = new BoxArchive(containerEl, []);

            archiveComponent.destroy();
            archiveComponent = null;

            expect(ReactDOM.unmountComponentAtNode).to.be.called;
        });
    });

    describe('constructor render', () => {
        it('should render archive explorer with the right data', () => {
            const renderStub = sandbox.stub(ReactDOM, 'render');
            const data = [{ name: 'test.json' }];

            archiveComponent = new BoxArchive(containerEl, data);

            const archiveExplorer = renderStub.firstCall.args[0];
            expect(archiveExplorer.props.itemCollection).to.equal(data);
        });
    });
});
