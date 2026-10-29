// The PlainText.scss and Markdown.scss rules that can match inside the print iframe, which holds only
// the text element. Keep them in sync with those files; printStyles-test.ts fails when they drift.
export const PLAIN_TEXT_PRINT_STYLES = `
.bp-text-plain {
    position: absolute;
    inset: 0;
    overflow: auto;
    margin: 0;
    line-height: 1.5;
    text-align: left;
    word-wrap: break-word;
    white-space: pre-wrap;
    background-color: #fff;
}

.bp-text-plain ul {
    list-style: disc;
}

.bp-text-plain ol {
    list-style: decimal;
}

.bp-text-plain ol ul,
.bp-text-plain ul ul {
    list-style: circle;
}

.bp-text-truncated {
    padding-bottom: 75px;
    font-family: Lato, "Helvetica Neue", Helvetica, Arial, sans-serif;
    text-align: center;
}

.bp-text-truncated p {
    margin: 10px 0;
}

@media print {
    .bp-text-plain {
        position: static;
        overflow: visible;
        margin: 0;
        padding: 0;
        word-wrap: break-word;
    }

    .bp-text-truncated .bp-btn-download,
    .bp-TruncatedTextNoticeV2-download {
        display: none;
    }
}
`;

export const MARKDOWN_PRINT_STYLES = `${PLAIN_TEXT_PRINT_STYLES}
.markdown-body {
    white-space: normal;
}

.markdown-body ul li {
    list-style: disc;
}
`;
