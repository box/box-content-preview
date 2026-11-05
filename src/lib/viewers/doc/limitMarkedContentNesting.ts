import type { PDFPageProxy } from 'pdfjs-dist';

// pdf.js nests a text layer span per level, and Chrome hangs laying out thousands
const MAX_MARKED_CONTENT_LEVELS = 64;

export type TextContent = Awaited<ReturnType<PDFPageProxy['getTextContent']>>;

export type TextContentItem = TextContent['items'][number];

export type TextContentPage = Pick<PDFPageProxy, 'streamTextContent'>;

const isMarkedContentStart = (item: TextContentItem): boolean =>
    'type' in item && (item.type === 'beginMarkedContent' || item.type === 'beginMarkedContentProps');

const isMarkedContentEnd = (item: TextContentItem): boolean => 'type' in item && item.type === 'endMarkedContent';

/** Tracks open marked content levels across calls, so use one filter per text stream. */
export function createMarkedContentNestingFilter(
    maxMarkedContentLevels = MAX_MARKED_CONTENT_LEVELS,
): (items: TextContentItem[]) => TextContentItem[] {
    let openLevels = 0;

    return items =>
        items.filter(item => {
            if (isMarkedContentStart(item)) {
                openLevels += 1;
                return openLevels <= maxMarkedContentLevels;
            }
            if (isMarkedContentEnd(item)) {
                if (openLevels === 0) {
                    return false;
                }
                openLevels -= 1;
                return openLevels < maxMarkedContentLevels;
            }
            return true;
        });
}

export default function limitMarkedContentNesting<Page extends TextContentPage>(
    pdfDocument: { getPage(pageNumber: number): Promise<Page> },
    maxMarkedContentLevels = MAX_MARKED_CONTENT_LEVELS,
): void {
    // pdf.js returns the same cached page from every getPage call
    const limitedPages = new WeakSet<Page>();
    const getPage = pdfDocument.getPage.bind(pdfDocument);

    pdfDocument.getPage = pageNumber =>
        getPage(pageNumber).then(page => {
            if (limitedPages.has(page)) {
                return page;
            }
            limitedPages.add(page);

            const streamTextContent = page.streamTextContent.bind(page);
            page.streamTextContent = params => {
                const filterItems = createMarkedContentNestingFilter(maxMarkedContentLevels);
                return streamTextContent(params).pipeThrough(
                    new TransformStream<TextContent, TextContent>({
                        transform(chunk, controller) {
                            controller.enqueue({ ...chunk, items: filterItems(chunk.items) });
                        },
                    }),
                );
            };
            return page;
        });
}
