import { MODEL3D_STATIC_ASSETS_VERSION } from '../../../constants';

const consoleLog = global.console.log;

global.console.log = message => {
    // Workaround to suppress irrelevant console messages regarding schema compatibility in Box3D/AJV
    if (typeof message === 'string' && message.indexOf('$ref: all keywords') >= 0) {
        return;
    }

    consoleLog(message);
};

/* eslint-disable import/no-dynamic-require */
const Box3DRuntime = require(`../../../../third-party/model3d/${MODEL3D_STATIC_ASSETS_VERSION}/box3d-runtime.min.js`);
const THREE = require(`../../../../third-party/model3d/${MODEL3D_STATIC_ASSETS_VERSION}/three.min.js`);
/* eslint-enable import/no-dynamic-require */

global.console.log = consoleLog;

export { THREE };
export default Box3DRuntime;
