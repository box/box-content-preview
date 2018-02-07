import {
    uuidv4,
    getClientLogDetails,
    createPreviewError
} from '../logUtils';
import { CLIENT_VERSION } from '../util';
import Browser from '../Browser';


const sandbox = sinon.sandbox.create();

describe('lib/logUtils', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('uuidv4()', () => {
        it('should output a 36 char RFC4122 version 4 compliant uuid', () => {
            // note the '4' in xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
            const uuid = uuidv4();
            expect(uuid.length).to.equal(36);
            expect(uuid[14]).to.equal('4');
        });
    });

    describe('getClientLogDetails()', () => {
        it('should return an object with correct client version', () => {
            const details = getClientLogDetails();
            expect(details.client_version).to.equal(CLIENT_VERSION);
        });

        it('should return an object with correct browser name', () => {
            const details = getClientLogDetails();
            expect(details.browser_name).to.equal(Browser.getName());
        });

        it('should return a session id that is a 36 char uuid', () => {
            const details = getClientLogDetails();
            expect(details.logger_session_id.length).to.equal(36);
        });
    });

    describe('createPreviewError()', () => {
        it('should return an error', () => {
            const err = createPreviewError();
            expect(err).to.be.an('Error');
        });

        it('should add a code property to the error', () => {
            const code = 'bad_job';
            const err = createPreviewError(code);

            expect(err.code).to.equal(code);
        });

        it('should set the message property with the provided details', () => {
            const details = { stuff: 'junk' };
            const err = createPreviewError('', 'foo', details);

            expect(err.message).to.deep.equal(details);
        });

        it('should set the message property to the displayMessage if no details provided', () => {
            const display = 'Yikes!';
            const err = createPreviewError('', display, undefined);

            expect(err.message).to.equal(display);
        });

        it('should add a displayMessage property', () => {
            const display = 'Yikes!';
            const err = createPreviewError('', display);

            expect(err.displayMessage).to.equal(display);
        });

        it('should set the displayMesage to error_refresh if one has not been provided', () => {
            const errRefresh = __('error_refresh');
            const err = createPreviewError();

            expect(err.displayMessage).to.equal(errRefresh);
        });
    });
});
