import ImageLoader from './image/image-loader';
import SwfLoader from './swf/swf-loader';
import TextLoader from './text/text-loader';
import MediaLoader from './media/media-loader';
import DocLoader from './doc/doc-loader';
import UnsupportedLoader from './unsupported/unsupported-loader';

// Order in this list matters
export default [
    SwfLoader,
    MediaLoader,
    TextLoader, // should come before document
    DocLoader, // should come after text
    ImageLoader,
    UnsupportedLoader // should be the last loader
];
