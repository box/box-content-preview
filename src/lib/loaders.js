import ImageLoader from './viewers/image/ImageLoader';
import Image360Loader from './viewers/box3d/image360/image360-loader';
import SWFLoader from './viewers/swf/SWFLoader';
import TextLoader from './viewers/text/TextLoader';
import MediaLoader from './viewers/media/media-loader';
import Video360Loader from './viewers/box3d/video360/video360-loader';
import DocLoader from './viewers/doc/DocLoader';
import Model3dLoader from './viewers/box3d/model3d/model3d-loader';
import IFrameLoader from './viewers/iframe/IFrameLoader';
import OfficeLoader from './viewers/office/OfficeLoader';

// Order in this list matters
export default [
    TextLoader, // should come before document
    OfficeLoader, // should come before document
    DocLoader, // should come after text
    SWFLoader,
    Video360Loader,
    MediaLoader,
    Image360Loader,
    ImageLoader,
    Model3dLoader,
    IFrameLoader
];
