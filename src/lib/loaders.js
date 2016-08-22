import ImageLoader from './viewers/image/image-loader';
import Image360Loader from './viewers/box3d/image360/image360-loader';
import SwfLoader from './viewers/swf/swf-loader';
import TextLoader from './viewers/text/text-loader';
import MediaLoader from './viewers/media/media-loader';
import Video360Loader from './viewers/box3d/video360/video360-loader';
import DocLoader from './viewers/doc/doc-loader';
import Model3dLoader from './viewers/box3d/model3d/model3d-loader';
import IFrameLoader from './viewers/iframe/iframe-loader';
// import OfficeLoader from './viewers/office/office-loader';
import ErrorLoader from './viewers/error/error-loader';

// Order in this list matters
export default [
    SwfLoader,
    Video360Loader,
    MediaLoader,
    // OfficeLoader, // should come before document
    TextLoader, // should come before document
    DocLoader, // should come after text
    Image360Loader,
    ImageLoader,
    Model3dLoader,
    IFrameLoader,
    ErrorLoader // should be the last loader
];
