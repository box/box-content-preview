import ImageLoader from './image/image-loader';
import Image360Loader from './box3d/image360/image360-loader';
import SwfLoader from './swf/swf-loader';
// import TextLoader from './text/text-loader';
import MediaLoader from './media/media-loader';
import Video360Loader from './box3d/video360/video360-loader';
import DocLoader from './doc/doc-loader';
import Model3dLoader from './box3d/model3d/model3d-loader';
import IFrameLoader from './iframe/iframe-loader';
import ErrorLoader from './error/error-loader';

// Order in this list matters
export default [
    SwfLoader,
    MediaLoader,
    Video360Loader,
    // Not using the text or csv viewer for now
    // TextLoader, // should come before document
    DocLoader, // should come after text
    ImageLoader,
    Image360Loader,
    Model3dLoader,
    IFrameLoader,
    ErrorLoader // should be the last loader
];
