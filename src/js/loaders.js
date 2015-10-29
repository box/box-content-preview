import ImageLoader from './image/image-loader';
import SwfLoader from './swf/swf-loader';
import TextLoader from './text/text-loader';
import MediaLoader from './media/media-loader';
import DocLoader from './doc/doc-loader';
import UnsupportedLoader from './unsupported/unsupported-loader';

export default [
    SwfLoader,
    MediaLoader,
    DocLoader,
    ImageLoader,
    TextLoader,
    UnsupportedLoader
];
