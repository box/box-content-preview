'use strict';

import ImageLoader from './image/image-loader';
import Image360Loader from './box3d/image360/image360-loader';
import SwfLoader from './swf/swf-loader';
import TextLoader from './text/text-loader';
import MediaLoader from './media/media-loader';
import DocLoader from './doc/doc-loader';
import Model3dLoader from './box3d/model3d/model3d-loader';
import ErrorLoader from './error/error-loader';

// Order in this list matters
export default [
    SwfLoader,
    MediaLoader,
    TextLoader, // should come before document
    DocLoader, // should come after text
    ImageLoader,
    Image360Loader,
    Model3dLoader,
    ErrorLoader // should be the last loader
];
