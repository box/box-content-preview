import {
    ReadableStream as NodeReadableStream,
    TransformStream as NodeTransformStream,
    WritableStream as NodeWritableStream,
} from 'stream/web';
import limitMarkedContentNesting, {
    createMarkedContentNestingFilter,
    TextContent,
    TextContentItem,
    TextContentPage,
} from '../limitMarkedContentNesting';

const beginMarker: TextContentItem = { type: 'beginMarkedContentProps', id: 'p1' };
const endMarker: TextContentItem = { type: 'endMarkedContent', id: '' };
const createTextItem = (str: string): TextContentItem => ({
    str,
    dir: 'ltr',
    transform: [],
    width: 0,
    height: 0,
    fontName: '',
    hasEOL: false,
});
const nestInMarkedContent = (levels: number, inner: TextContentItem): TextContentItem[] => [
    ...Array(levels).fill(beginMarker),
    inner,
    ...Array(levels).fill(endMarker),
];

describe('createMarkedContentNestingFilter', () => {
    test('should keep marked content within the nesting limit', () => {
        const items = nestInMarkedContent(2, createTextItem('a'));

        expect(createMarkedContentNestingFilter(2)(items)).toEqual(items);
    });

    test('should drop marked content nested past the limit and keep the text inside it', () => {
        expect(createMarkedContentNestingFilter(2)(nestInMarkedContent(4, createTextItem('a')))).toEqual(
            nestInMarkedContent(2, createTextItem('a')),
        );
    });

    test('should allow 64 levels by default', () => {
        const filtered = createMarkedContentNestingFilter()(nestInMarkedContent(100, createTextItem('a')));

        expect(filtered.filter(item => item === beginMarker)).toHaveLength(64);
        expect(filtered.filter(item => item === endMarker)).toHaveLength(64);
    });

    test('should count marked content with and without properties toward the same limit', () => {
        const beginMarkerWithoutProps: TextContentItem = { type: 'beginMarkedContent', id: '' };
        const items = [beginMarkerWithoutProps, beginMarker, createTextItem('a'), endMarker, endMarker];

        expect(createMarkedContentNestingFilter(1)(items)).toEqual([
            beginMarkerWithoutProps,
            createTextItem('a'),
            endMarker,
        ]);
    });

    test('should track nesting across chunks of the same stream', () => {
        const filterItems = createMarkedContentNestingFilter(1);

        expect(filterItems([beginMarker, beginMarker])).toEqual([beginMarker]);
        expect(filterItems([createTextItem('a'), endMarker, endMarker])).toEqual([createTextItem('a'), endMarker]);
    });

    test('should drop an unmatched end without letting later markers exceed the limit', () => {
        const filterItems = createMarkedContentNestingFilter(1);

        expect(filterItems([endMarker, beginMarker, beginMarker, createTextItem('a')])).toEqual([
            beginMarker,
            createTextItem('a'),
        ]);
    });
});

describe('limitMarkedContentNesting', () => {
    const originalStreams = {
        ReadableStream: globalThis.ReadableStream,
        TransformStream: globalThis.TransformStream,
        WritableStream: globalThis.WritableStream,
    };

    const createChunk = (items: TextContentItem[]): TextContent => ({ items, styles: {}, lang: null });
    const createChunkStream = (chunks: TextContent[]): ReadableStream<TextContent> =>
        new ReadableStream<TextContent>({
            start(controller) {
                chunks.forEach(chunk => controller.enqueue(chunk));
                controller.close();
            },
        });
    const readAllItems = async (stream: ReadableStream<TextContent>): Promise<TextContentItem[]> => {
        const items: TextContentItem[] = [];
        await stream.pipeTo(
            new WritableStream<TextContent>({
                write(chunk) {
                    items.push(...chunk.items);
                },
            }),
        );
        return items;
    };
    const createPdfDocument = (page: TextContentPage): { getPage(pageNumber: number): Promise<TextContentPage> } => ({
        getPage: () => Promise.resolve(page),
    });

    beforeAll(() => {
        Object.assign(globalThis, {
            ReadableStream: NodeReadableStream,
            TransformStream: NodeTransformStream,
            WritableStream: NodeWritableStream,
        });
    });

    afterAll(() => {
        Object.assign(globalThis, originalStreams);
    });

    test('should forward params and limit marked content nesting in a page text stream', async () => {
        const streamTextContent = jest.fn(() =>
            createChunkStream([
                createChunk([beginMarker, beginMarker, createTextItem('a')]),
                createChunk([endMarker, endMarker]),
            ]),
        );
        const pdfDocument = createPdfDocument({ streamTextContent });
        const params = { includeMarkedContent: true };

        limitMarkedContentNesting(pdfDocument, 1);
        const page = await pdfDocument.getPage(1);
        const items = await readAllItems(page.streamTextContent(params));

        expect(streamTextContent).toHaveBeenCalledWith(params);
        expect(items).toEqual([beginMarker, createTextItem('a'), endMarker]);
    });

    test('should keep the styles and lang of each chunk', async () => {
        const chunk: TextContent = {
            items: [createTextItem('a')],
            styles: { f1: { ascent: 1, descent: 0, vertical: false, fontFamily: 'serif' } },
            lang: 'en',
        };
        const pdfDocument = createPdfDocument({ streamTextContent: () => createChunkStream([chunk]) });

        limitMarkedContentNesting(pdfDocument);
        const page = await pdfDocument.getPage(1);
        const reader = page.streamTextContent().getReader();

        expect((await reader.read()).value).toEqual(chunk);
    });

    test('should wrap a cached page only once', async () => {
        const pdfDocument = createPdfDocument({
            streamTextContent: () => createChunkStream([createChunk([beginMarker, endMarker])]),
        });

        limitMarkedContentNesting(pdfDocument, 1);
        const { streamTextContent: firstStreamTextContent } = await pdfDocument.getPage(1);
        const { streamTextContent: secondStreamTextContent } = await pdfDocument.getPage(1);

        expect(secondStreamTextContent).toBe(firstStreamTextContent);
    });

    test('should track nesting separately for each text stream', async () => {
        const pdfDocument = createPdfDocument({
            streamTextContent: () => createChunkStream([createChunk([beginMarker, beginMarker])]),
        });

        limitMarkedContentNesting(pdfDocument, 1);
        const page = await pdfDocument.getPage(1);

        expect(await readAllItems(page.streamTextContent())).toEqual([beginMarker]);
        expect(await readAllItems(page.streamTextContent())).toEqual([beginMarker]);
    });
});
