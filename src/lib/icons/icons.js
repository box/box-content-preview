import DROP_DOWN from './arrow_drop_down_24px.svg';
import DROP_UP from './arrow_drop_up_24px.svg';
import DELETE from './delete_24px.svg';
import FULLSCREEN_IN from './full_screen_in_24px.svg';
import FULLSCREEN_OUT from './full_screen_out_24px.svg';
import ROTATE_LEFT from './rotate_left_24px.svg';
import ZOOM_IN from './zoom_in_24px.svg';
import ZOOM_OUT from './zoom_out_24px.svg';
import ARROW_LEFT from './arrow_left_24px.svg';
import ARROW_RIGHT from './arrow_right_24px.svg';
import CHECK_MARK from './checkmark_24px.svg';
import GEAR from './gear_24px.svg';
import FILE_AUDIO from './file_audio.svg';
import FILE_AUTOCAD from './file_autocad.svg';
import FILE_BOX_NOTE from './file_box_note.svg';
import FILE_CODE from './file_code.svg';
import FILE_DICOM from './file_dicom.svg';
import FILE_DEFAULT from './file_default.svg';
import FILE_DOCUMENT from './file_document.svg';
import FILE_EXCEL from './file_excel.svg';
import FILE_GOOGLE_DOC from './file_google_doc.svg';
import FILE_GOOGLE_SHEET from './file_google_sheet.svg';
import FILE_GOOGLE_SLIDE from './file_google_slide.svg';
import FILE_ILLUSTRATOR from './file_illustrator.svg';
import FILE_IMAGE from './file_image.svg';
import FILE_KEYNOTE from './file_keynote.svg';
import FILE_MEDIA from './file_media.svg';
import FILE_NUMBERS from './file_numbers.svg';
import FILE_OBJ from './file_obj.svg';
import FILE_PAGES from './file_pages.svg';
import FILE_PDF from './file_pdf.svg';
import FILE_POWERPOINT from './file_powerpoint.svg';
import FILE_PRESENTATION from './file_presentation.svg';
import FILE_SPREADSHEET from './file_spreadsheet.svg';
import FILE_WORD from './file_word.svg';
import FILE_ZIP from './file_zip.svg';
import ANIMATION from './animation_24px.svg';
import PAUSE from './pause_24px.svg';
import PLAY from './play_24px.svg';
import PLAY_LARGE from './play_48px.svg';
import RESET from './3D_reset_24px.svg';
import VR from './3D_vr_24px.svg';
import FIND_DROP_DOWN from './arrow_drop_down.svg';
import FIND_DROP_UP from './arrow_drop_up.svg';
import CLOSE from './close.svg';
import SEARCH from './search.svg';
import PRINT_CHECKMARK from './print_checkmark.svg';
import THUMBNAILS_TOGGLE from './thumbnails-toggle-icon.svg';

export const ICON_DROP_DOWN = DROP_DOWN;
export const ICON_DROP_UP = DROP_UP;
export const ICON_DELETE = DELETE;
export const ICON_FULLSCREEN_IN = FULLSCREEN_IN;
export const ICON_FULLSCREEN_OUT = FULLSCREEN_OUT;
export const ICON_ROTATE_LEFT = ROTATE_LEFT;
export const ICON_ZOOM_IN = ZOOM_IN;
export const ICON_ZOOM_OUT = ZOOM_OUT;
export const ICON_ARROW_LEFT = ARROW_LEFT;
export const ICON_ARROW_RIGHT = ARROW_RIGHT;
export const ICON_CHECK_MARK = CHECK_MARK;
export const ICON_GEAR = GEAR;
export const ICON_ANIMATION = ANIMATION;
export const ICON_PAUSE = PAUSE;
export const ICON_PLAY = PLAY;
export const ICON_PLAY_LARGE = PLAY_LARGE;
export const ICON_3D_RESET = RESET;
export const ICON_3D_VR = VR;
export const ICON_FIND_DROP_DOWN = FIND_DROP_DOWN;
export const ICON_FIND_DROP_UP = FIND_DROP_UP;
export const ICON_CLOSE = CLOSE;
export const ICON_SEARCH = SEARCH;
export const ICON_PRINT_CHECKMARK = PRINT_CHECKMARK;
export const ICON_THUMBNAILS_TOGGLE = THUMBNAILS_TOGGLE;

const FILE_LOADING_ICONS = {
    FILE_AUDIO,
    FILE_AUTOCAD,
    FILE_BOX_NOTE,
    FILE_CODE,
    FILE_DEFAULT,
    FILE_DICOM,
    FILE_DOCUMENT,
    FILE_EXCEL,
    FILE_GOOGLE_DOC,
    FILE_GOOGLE_SHEET,
    FILE_GOOGLE_SLIDE,
    FILE_ILLUSTRATOR,
    FILE_IMAGE,
    FILE_KEYNOTE,
    FILE_MEDIA,
    FILE_NUMBERS,
    FILE_OBJ,
    FILE_PAGES,
    FILE_PDF,
    FILE_POWERPOINT,
    FILE_PRESENTATION,
    FILE_SPREADSHEET,
    FILE_WORD,
    FILE_ZIP
};

export const ICON_FILE_MAP = {};

/**
 * Utility to map extensions to an icon name
 * @param {Array} extensions - Array of extensions
 * @param {string} iconName - Icon name
 * @return {void}
 */
function mapExtensionsToIcon(extensions, iconName) {
    extensions.forEach((extension) => {
        ICON_FILE_MAP[extension] = iconName;
    });
}

// AUDIO ICON EXTENSIONS
mapExtensionsToIcon(
    ['aac', 'aif', 'aifc', 'aiff', 'amr', 'au', 'flac', 'm4a', 'mp3', 'ra', 'wav', 'wma'],
    'FILE_AUDIO'
);

// BOXNOTE ICON EXTENSIONS
mapExtensionsToIcon(['boxnote'], 'FILE_BOX_NOTE');

// CODE ICON EXTENSIONS
mapExtensionsToIcon(
    [
        'as',
        'as3',
        'asm',
        'bat',
        'c',
        'cc',
        'cmake',
        'cpp',
        'cs',
        'css',
        'cxx',
        'diff',
        'erb',
        'groovy',
        'h',
        'haml',
        'hh',
        'htm',
        'html',
        'java',
        'js',
        'json',
        'less',
        'm',
        'make',
        'md',
        'ml',
        'mm',
        'php',
        'pl',
        'plist',
        'properties',
        'py',
        'rb',
        'rst',
        'sass',
        'scala',
        'script',
        'scm',
        'sml',
        'sql',
        'sh',
        'vi',
        'vim',
        'webdoc',
        'xml',
        'xsd',
        'xsl',
        'yaml'
    ],
    'FILE_CODE'
);

// EXCEL ICON EXTENSIONS
mapExtensionsToIcon(['xls', 'xlsm', 'xlsx'], 'FILE_EXCEL');

// DOCUMENT ICON EXTENSIONS
mapExtensionsToIcon(['log', 'msg', 'ods', 'rtf', 'txt', 'wpd'], 'FILE_DOCUMENT');

// GOOGLE DOC ICON EXTENSIONS
mapExtensionsToIcon(['gdoc'], 'FILE_GOOGLE_DOC');

// GOOGLE SHEET ICON EXTENSIONS
mapExtensionsToIcon(['gsheet'], 'FILE_GOOGLE_SHEET');

// GOOGLE SLIDE ICON EXTENSIONS
mapExtensionsToIcon(['gslide'], 'FILE_GOOGLE_SLIDE');

// IMAGE ICON EXTENSIONS
mapExtensionsToIcon(
    [
        'ai',
        'bmp',
        'dcm',
        'eps',
        'gif',
        'heic',
        'jpg',
        'jpeg',
        'png',
        'ps',
        'psd',
        'svg',
        'svs',
        'swf',
        'tga',
        'tif',
        'tiff'
    ],
    'FILE_IMAGE'
);

// KEYNOTE ICON EXTENSIONS
mapExtensionsToIcon(['key'], 'FILE_KEYNOTE');

// MEDIA ICON EXTENSIONS
mapExtensionsToIcon(
    [
        '3g2',
        '3gp',
        'avi',
        'flv',
        'm2v',
        'm2ts',
        'm4v',
        'mkv',
        'mov',
        'mp4',
        'mpeg',
        'mpg',
        'mts',
        'ogg',
        'qt',
        'ts',
        'wmv'
    ],
    'FILE_MEDIA'
);

// NUMBERS ICON EXTENSIONS
mapExtensionsToIcon(['numbers'], 'FILE_NUMBERS');

// OBJ ICON EXTENSIONS
mapExtensionsToIcon(['3ds', 'box3d', 'dae', 'fbx', 'obj', 'ply', 'stl'], 'FILE_OBJ');

// PAGES ICON EXTENSIONS
mapExtensionsToIcon(['pages'], 'FILE_PAGES');

// PDF ICON EXTENSIONS
mapExtensionsToIcon(['pdf'], 'FILE_PDF');

// POWERPOINT ICON EXTENSIONS
mapExtensionsToIcon(['ppt', 'pptx'], 'FILE_POWERPOINT');

// PRESENTATION ICON EXTENSIONS
mapExtensionsToIcon(['odp'], 'FILE_PRESENTATION');

// SPREADSHEET ICON EXTENSIONS
mapExtensionsToIcon(['csv', 'tsv'], 'FILE_SPREADSHEET');

// WORD ICON EXTENSIONS
mapExtensionsToIcon(['doc', 'docx'], 'FILE_WORD');

// ZIP ICON EXTENSIONS
mapExtensionsToIcon(['tgz', 'zip'], 'FILE_ZIP');

// AUTOCAD ICON EXTENSIONS
mapExtensionsToIcon(['dwg'], 'FILE_AUTOCAD');

/**
 * Map from file extension to svg.
 *
 * @public
 * @param {string} fileExtension - The extension of the file
 * @return {HTMLElement} The SVG of the requested file icon
 */
export function getIconFromExtension(fileExtension) {
    const iconName = ICON_FILE_MAP[fileExtension];
    return FILE_LOADING_ICONS[iconName];
}

/**
 * Map from icon file name to svg.
 *
 * @public
 * @param {string} iconName - The name of the icon
 * @return {HTMLElement} The SVG of the requested file icon
 */
export function getIconFromName(iconName) {
    return FILE_LOADING_ICONS[iconName];
}
