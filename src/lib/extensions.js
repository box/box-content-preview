// If changes are made to this file to support more extensions that are "highlightable", then make sure to
// check if we need to upgrade the highlightjs custom build to add language grammar for that new extension language.
// See build/upgrade_highlightjs.sh
export const NON_CODE_EXTENSIONS = ['csv', 'log', 'md', 'tsv', 'txt'];

export const HTML_EXTENSIONS = ['htm', 'html', 'xhtml', 'xml', 'xsd', 'xsl']; // These types do not have an appropriate extracted text representation for preview

export const CODE_EXTENSIONS = [
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
    'java',
    'js',
    'json',
    'less',
    'm',
    'make',
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
    'yaml',
];

export const DOCUWORKS_EXTENSIONS = ['xdw', 'xbd'];
// Should not include 'xlsb', since xlsb conversion to pdf is not supported
// However, office viewer supports xlsb, xlsm, and xlsx (new formats), but not xls (old)
export const EXCEL_EXTENSIONS = ['xls', 'xlsm', 'xlsx'];
export const EXCLUDED_EXTENSIONS = EXCEL_EXTENSIONS.concat(['numbers']);
export const INDESIGN_EXTENSIONS = ['idml', 'indd', 'indt', 'inx'];
export const OFFICE_ONLINE_EXTENSIONS = ['xlsx', 'xlsm', 'xlsb'];

export const DOCUMENT_EXTENSIONS = CODE_EXTENSIONS.concat(NON_CODE_EXTENSIONS)
    .concat(HTML_EXTENSIONS)
    .concat(EXCEL_EXTENSIONS)
    .concat(INDESIGN_EXTENSIONS)
    .concat(DOCUWORKS_EXTENSIONS)
    .concat([
        'doc',
        'docx',
        'dwg',
        'gdoc',
        'gsheet',
        'gslide',
        'gslides',
        'key',
        'msg',
        'numbers',
        'odp',
        'ods',
        'odt',
        'pages',
        'pdf',
        'ppt',
        'pptx',
        'rtf',
        'wpd',
    ]);

export const TXT_EXTENSIONS = CODE_EXTENSIONS.concat(NON_CODE_EXTENSIONS);

export const HIGHLIGHTTABLE_EXTENSIONS = CODE_EXTENSIONS.concat(HTML_EXTENSIONS);
