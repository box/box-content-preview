import { MODEL3D_STATIC_ASSETS_VERSION } from '../../constants';

const STATIC_URI = `third-party/model3d/${MODEL3D_STATIC_ASSETS_VERSION}/`;
const JS = [
    `${STATIC_URI}boxsdk.min.js`,
    `${STATIC_URI}three.min.js`,
    `${STATIC_URI}box3d-runtime.min.js`,
    `${STATIC_URI}webvr-polyfill.js`,
    `${STATIC_URI}WebVR/VRConfig.js`
];
export default JS;
