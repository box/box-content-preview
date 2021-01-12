import FULLSCREEN_IN from './full_screen_in_24px.svg';
import FULLSCREEN_OUT from './full_screen_out_24px.svg';
import ARROW_LEFT from './arrow_left_24px.svg';
import ARROW_RIGHT from './arrow_right_24px.svg';
import CHECK_MARK from './checkmark_24px.svg';
import GEAR from './gear_24px.svg';
import FILE_AUDIO from './IconFileAudio32.svg';
import FILE_AUTOCAD from './IconFileDwg32.svg';
import FILE_BOX_NOTE from './IconFileBoxNote32.svg';
import FILE_CODE from './IconFileCode32.svg';
import FILE_DEFAULT from './IconFileDefault32.svg';
import FILE_DOCUMENT from './IconFileText32.svg';
import FILE_EXCEL from './IconFileExcel32.svg';
import FILE_GOOGLE_DOC from './IconFileDocs32.svg';
import FILE_GOOGLE_SHEET from './IconFileSheets32.svg';
import FILE_GOOGLE_SLIDE from './IconFileSlides32.svg';
import FILE_ILLUSTRATOR from './IconFileIllustrator32.svg';
import FILE_IMAGE from './IconFileImage32.svg';
import FILE_KEYNOTE from './IconFileKeynote32.svg';
import FILE_MEDIA from './IconFileVideo32.svg';
import FILE_NUMBERS from './IconFileNumbers32.svg';
import FILE_OBJ from './IconFileThreeD32.svg';
import FILE_PAGES from './IconFilePages32.svg';
import FILE_PDF from './IconFilePDF32.svg';
import FILE_POWERPOINT from './IconFilePowerpoint32.svg';
import FILE_PRESENTATION from './IconFilePresentation32.svg';
import FILE_SPREADSHEET from './IconFileSpreadsheet32.svg';
import FILE_VECTOR from './IconFileVector32.svg';
import FILE_WORD from './IconFileWord32.svg';
import FILE_ZIP from './IconFileZip32.svg';
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

export const ICON_FULLSCREEN_IN = FULLSCREEN_IN;
export const ICON_FULLSCREEN_OUT = FULLSCREEN_OUT;
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

const FILE_LOADING_ICONS = {
    FILE_AUDIO,
    FILE_AUTOCAD,
    FILE_BOX_NOTE,
    FILE_CODE,
    FILE_DEFAULT,
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
    FILE_VECTOR,
    FILE_WORD,
    FILE_ZIP,
};

export const ICON_FILE_MAP = {};

// AUDIO ICON EXTENSIONS
['aac', 'aif', 'aifc', 'aiff', 'amr', 'au', 'flac', 'm4a', 'mp3', 'ra', 'wav', 'wma'].forEach(extension => {
    ICON_FILE_MAP[extension] = 'FILE_AUDIO';
});

// BOXNOTE ICON EXTENSIONS
['boxnote'].forEach(extension => {
    ICON_FILE_MAP[extension] = 'FILE_BOX_NOTE';
});

// CODE ICON EXTENSIONS
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
    'yaml',
].forEach(extension => {
    ICON_FILE_MAP[extension] = 'FILE_CODE';
});

// EXCEL ICON EXTENSIONS
['xls', 'xlsm', 'xlsx', 'xlsb'].forEach(extension => {
    ICON_FILE_MAP[extension] = 'FILE_EXCEL';
});

// DOCUMENT ICON EXTENSIONS
['log', 'msg', 'ods', 'rtf', 'txt', 'wpd'].forEach(extension => {
    ICON_FILE_MAP[extension] = 'FILE_DOCUMENT';
});

// GOOGLE DOC ICON EXTENSIONS
['gdoc'].forEach(extension => {
    ICON_FILE_MAP[extension] = 'FILE_GOOGLE_DOC';
});

// GOOGLE SHEET ICON EXTENSIONS
['gsheet'].forEach(extension => {
    ICON_FILE_MAP[extension] = 'FILE_GOOGLE_SHEET';
});

// GOOGLE SLIDE ICON EXTENSIONS
['gslide'].forEach(extension => {
    ICON_FILE_MAP[extension] = 'FILE_GOOGLE_SLIDE';
});

// IMAGE ICON EXTENSIONS
[
    'ai',
    'bmp',
    'cr2',
    'crw',
    'dcm',
    'dng',
    'gif',
    'heic',
    'jpeg',
    'jpg',
    'nef',
    'png',
    'ps',
    'psd',
    'raf',
    'raw',
    'svg',
    'swf',
    'tga',
    'tif',
    'tiff',
].forEach(extension => {
    ICON_FILE_MAP[extension] = 'FILE_IMAGE';
});

// VECTOR ICON EXTENSIONS
['eps'].forEach(extension => {
    ICON_FILE_MAP[extension] = 'FILE_VECTOR';
});

// KEYNOTE ICON EXTENSIONS
['key'].forEach(extension => {
    ICON_FILE_MAP[extension] = 'FILE_KEYNOTE';
});

// MEDIA ICON EXTENSIONS
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
    'wmv',
].forEach(extension => {
    ICON_FILE_MAP[extension] = 'FILE_MEDIA';
});

// NUMBERS ICON EXTENSIONS
['numbers'].forEach(extension => {
    ICON_FILE_MAP[extension] = 'FILE_NUMBERS';
});

// OBJ ICON EXTENSIONS
['3ds', 'box3d', 'dae', 'fbx', 'obj', 'ply', 'stl'].forEach(extension => {
    ICON_FILE_MAP[extension] = 'FILE_OBJ';
});

// PAGES ICON EXTENSIONS
['pages'].forEach(extension => {
    ICON_FILE_MAP[extension] = 'FILE_PAGES';
});

// PDF ICON EXTENSIONS
['pdf'].forEach(extension => {
    ICON_FILE_MAP[extension] = 'FILE_PDF';
});

// POWERPOINT ICON EXTENSIONS
['ppt', 'pptx'].forEach(extension => {
    ICON_FILE_MAP[extension] = 'FILE_POWERPOINT';
});

// PRESENTATION ICON EXTENSIONS
['odp'].forEach(extension => {
    ICON_FILE_MAP[extension] = 'FILE_PRESENTATION';
});

// SPREADSHEET ICON EXTENSIONS
['csv', 'tsv'].forEach(extension => {
    ICON_FILE_MAP[extension] = 'FILE_SPREADSHEET';
});

// WORD ICON EXTENSIONS
['doc', 'docx'].forEach(extension => {
    ICON_FILE_MAP[extension] = 'FILE_WORD';
});

// ZIP ICON EXTENSIONS
['tgz', 'zip'].forEach(extension => {
    ICON_FILE_MAP[extension] = 'FILE_ZIP';
});

// AUTOCAD ICON EXTENSIONS
['dwg'].forEach(extension => {
    ICON_FILE_MAP[extension] = 'FILE_AUTOCAD';
});

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
