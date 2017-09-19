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
    'yaml'
];

export const DOCUMENT_EXTENSIONS = CODE_EXTENSIONS.concat(NON_CODE_EXTENSIONS)
    .concat(HTML_EXTENSIONS)
    .concat([
        'doc',
        'docx',
        'gdoc',
        'gsheet',
        'msg',
        'odp',
        'ods',
        'odt',
        'pdf',
        'ppt',
        'pptx',
        'rtf',
        'wpd',
        'xls',
        'xlsm',
        'xlsx'
    ]);

export const TXT_EXTENSIONS = CODE_EXTENSIONS.concat(NON_CODE_EXTENSIONS);

export const HIGHLIGHTTABLE_EXTENSIONS = CODE_EXTENSIONS.concat(HTML_EXTENSIONS);
