import Browser from '../Browser';
import { CLIENT_VERSION } from '../util';
import { uuidv4, getClientLogDetails } from '../logUtils';

describe('lib/logUtils', () => {
    describe('uuidv4()', () => {
        test('should output a 36 char RFC4122 version 4 compliant uuid', () => {
            // note the '4' in xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
            const uuid = uuidv4();
            expect(uuid.length).toBe(36);
            expect(uuid[14]).toBe('4');
        });
    });

    describe('getClientLogDetails()', () => {
        test('should return an object with correct client version', () => {
            const details = getClientLogDetails();
            expect(details.client_version).toBe(CLIENT_VERSION);
        });

        test('should return an object with correct browser name', () => {
            const details = getClientLogDetails();
            expect(details.browser_name).toBe(Browser.getName());
        });

        test('should return a session id that is a 36 char uuid', () => {
            const details = getClientLogDetails();
            expect(details.logger_session_id.length).toBe(36);
        });
    });
});
