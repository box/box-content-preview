import ArchiveLoader from './viewers/archive/ArchiveLoader';
import ImageLoader from './viewers/image/ImageLoader';
import Image360Loader from './viewers/box3d/image360/Image360Loader';
import SWFLoader from './viewers/swf/SWFLoader';
import TextLoader from './viewers/text/TextLoader';
import MediaLoader from './viewers/media/MediaLoader';
import Video360Loader from './viewers/box3d/video360/Video360Loader';
import DocLoader from './viewers/doc/DocLoader';
import Model3DLoader from './viewers/box3d/model3d/Model3DLoader';
import IFrameLoader from './viewers/iframe/IFrameLoader';
import OfficeLoader from './viewers/office/OfficeLoader';

// Order in this list matters
export default [
    ArchiveLoader,
    TextLoader, // should come before document
    OfficeLoader, // should come before document
    DocLoader, // should come after text
    SWFLoader,
    Video360Loader,
    MediaLoader,
    Image360Loader,
    ImageLoader,
    Model3DLoader,
    IFrameLoader,
];
