import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CLASS_HIDDEN } from '../../../constants';
import { USER_DOCUMENT_FIND_EVENTS, VIEWER_EVENT } from '../../../events';
import { TABULAR_DIGIT_CLASS } from '../../../TabularDigits';
import {
    DocFindBarV2Root,
    FindMatchesCount,
    FindState,
    FindStateValue,
    PdfEventBus,
    PdfFindController,
} from '../DocFindBarV2';

describe('lib/viewers/doc/DocFindBarV2', () => {
    let containerEl: HTMLElement;
    let dispatch: jest.Mock;
    let eventBus: PdfEventBus;
    let findBar: DocFindBarV2Root;
    let findController: PdfFindController;

    const getInput = (): HTMLElement => screen.getByRole('searchbox', { name: __('find_label') });
    const getNext = (): HTMLElement => screen.getByRole('button', { name: __('find_next') });
    const getPrevious = (): HTMLElement => screen.getByRole('button', { name: __('find_previous') });
    const getClose = (): HTMLElement => screen.getByRole('button', { name: __('find_close') });

    const emitControlState = (state: FindStateValue, matchesCount?: FindMatchesCount): void => {
        act(() => findBar.handleFindControlState({ matchesCount, state }));
    };

    const emitMatchesCount = (matchesCount: FindMatchesCount): void => {
        act(() => findBar.handleFindMatchesCount({ matchesCount }));
    };

    const openWithQuery = async (query: string): Promise<void> => {
        act(() => findBar.open());
        await userEvent.type(getInput(), query);
        dispatch.mockClear();
    };

    const expectFindDispatch = (type: string, query: string, findPrevious?: boolean): void => {
        expect(dispatch).toBeCalledWith('find', {
            findPrevious,
            highlightAll: true,
            phraseSearch: true,
            query,
            type,
        });
    };

    beforeEach(() => {
        containerEl = document.createElement('div');
        document.body.appendChild(containerEl);
        dispatch = jest.fn();
        eventBus = { dispatch, off: jest.fn(), on: jest.fn() };
        findController = {};

        act(() => {
            findBar = new DocFindBarV2Root(containerEl, findController, eventBus);
        });
    });

    afterEach(() => {
        if (!findBar.isDestroyed) {
            act(() => findBar.destroy());
        }
        containerEl.remove();
    });

    describe('constructor()', () => {
        test.each`
            missing             | args                                         | message
            ${'container'}      | ${() => [null, findController, eventBus]}    | ${'DocFindBar cannot be used without a container element.'}
            ${'event bus'}      | ${() => [containerEl, findController, null]} | ${'DocFindBar cannot be used without an EventBus instance.'}
            ${'findController'} | ${() => [containerEl, null, eventBus]}       | ${'DocFindBar cannot be used without a PDFFindController instance.'}
        `('should throw if the $missing is missing', ({ args, message }) => {
            const [container, controller, bus] = args();

            expect(() => new DocFindBarV2Root(container, controller, bus)).toThrow(message);
        });

        test('should render a hidden find bar into the container with the document-findbar test id', () => {
            expect(screen.getByTestId('document-findbar')).toBe(findBar.findBarEl);
            expect(containerEl).toContainElement(findBar.findBarEl);
            expect(findBar.findBarEl).toHaveClass(CLASS_HIDDEN);
            expect(findBar.opened).toBe(false);
        });

        test('should render the search field and disabled navigation without a query', () => {
            expect(getInput()).toHaveValue('');
            expect(getPrevious()).toBeDisabled();
            expect(getNext()).toBeDisabled();
            expect(getClose()).toBeEnabled();
            expect(screen.queryByTestId('bp-DocFindBarV2-count')).not.toBeInTheDocument();
        });

        test('should subscribe to find state updates from the event bus', () => {
            expect(eventBus.on).toBeCalledWith('updatefindcontrolstate', findBar.handleFindControlState);
            expect(eventBus.on).toBeCalledWith('updatefindmatchescount', findBar.handleFindMatchesCount);
        });

        test('should tag the actionable elements for analytics', () => {
            expect(getPrevious()).toHaveAttribute('data-target-id', 'DocFindBarV2-previous');
            expect(getNext()).toHaveAttribute('data-target-id', 'DocFindBarV2-next');
            expect(getClose()).toHaveAttribute('data-target-id', 'DocFindBarV2-close');
        });
    });

    describe('destroy()', () => {
        test('should remove the bar, unsubscribe, and ignore later updates', () => {
            const listener = jest.fn();
            findBar.addListener('close', listener);

            act(() => findBar.destroy());

            expect(containerEl).not.toContainElement(findBar.findBarEl);
            expect(eventBus.off).toBeCalledWith('updatefindcontrolstate', findBar.handleFindControlState);
            expect(eventBus.off).toBeCalledWith('updatefindmatchescount', findBar.handleFindMatchesCount);
            expect(findBar.listenerCount('close')).toBe(0);
            expect(() => findBar.setFindFieldElValue('foo')).not.toThrow();
        });
    });

    describe('search', () => {
        test('should dispatch a find event as the user types', async () => {
            act(() => findBar.open());

            await userEvent.type(getInput(), 'ab');

            expect(getInput()).toHaveValue('ab');
            expectFindDispatch('find', 'a');
            expectFindDispatch('find', 'ab');
        });

        test('should set the field value for programmatic finds', () => {
            act(() => findBar.setFindFieldElValue('hello'));
            act(() => findBar.findFieldHandler());

            expect(getInput()).toHaveValue('hello');
            expectFindDispatch('find', 'hello');
        });

        test('should clear the query and keep the bar open when the clear button is clicked', async () => {
            await openWithQuery('foo');

            await userEvent.click(screen.getByRole('button', { name: __('search_clear') }));

            expect(getInput()).toHaveValue('');
            expectFindDispatch('find', '');
            expect(findBar.opened).toBe(true);
            expect(getInput()).toHaveFocus();
        });

        test('should return focus to the field when the clear button is activated by keyboard', async () => {
            await openWithQuery('foo');
            act(() => screen.getByRole('button', { name: __('search_clear') }).focus());

            await userEvent.keyboard('{Enter}');

            expect(getInput()).toHaveValue('');
            expect(getInput()).toHaveFocus();
        });
    });

    describe('match states', () => {
        test('should show the localized match count', async () => {
            await openWithQuery('foo');

            emitMatchesCount({ current: 2, total: 5 });

            expect(screen.getByTestId('bp-DocFindBarV2-count')).toHaveTextContent('2 of 5');
            expect(getPrevious()).toBeEnabled();
            expect(getNext()).toBeEnabled();
        });

        test('should render each digit of the count at a fixed width', async () => {
            await openWithQuery('foo');

            emitMatchesCount({ current: 12, total: 345 });

            const count = screen.getByTestId('bp-DocFindBarV2-count');
            expect(count.querySelectorAll(`.${TABULAR_DIGIT_CLASS}`)).toHaveLength(5);
        });

        test('should reserve the count slot with a hidden widest count before any search', () => {
            const sizer = findBar.findBarEl.querySelector('.bp-DocFindBarV2-countSizer');

            expect(sizer).toHaveTextContent('999 of 999');
            expect(sizer).toHaveAttribute('aria-hidden', 'true');
        });

        test('should hide the match count when there are no matches', async () => {
            await openWithQuery('foo');
            emitMatchesCount({ current: 1, total: 3 });

            emitMatchesCount({ current: 0, total: 0 });

            expect(screen.queryByTestId('bp-DocFindBarV2-count')).not.toBeInTheDocument();
        });

        test('should show a zero count and disable navigation when nothing matches', async () => {
            await openWithQuery('zzz');

            emitControlState(FindState.NOT_FOUND, { current: 0, total: 0 });

            expect(screen.getByTestId('bp-DocFindBarV2-count')).toHaveTextContent('0 of 0');
            expect(getPrevious()).toBeDisabled();
            expect(getNext()).toBeDisabled();
        });

        test('should not show a zero count when a not found update arrives without a query', () => {
            act(() => findBar.open());

            emitControlState(FindState.NOT_FOUND, { current: 0, total: 0 });

            expect(screen.queryByTestId('bp-DocFindBarV2-count')).not.toBeInTheDocument();
        });

        test('should keep the zero count while a search is pending and replace it once found', async () => {
            await openWithQuery('zzz');
            emitControlState(FindState.NOT_FOUND, { current: 0, total: 0 });

            emitControlState(FindState.PENDING);
            expect(screen.getByTestId('bp-DocFindBarV2-count')).toHaveTextContent('0 of 0');

            emitControlState(FindState.FOUND, { current: 1, total: 1 });
            expect(screen.getByTestId('bp-DocFindBarV2-count')).toHaveTextContent('1 of 1');
            expect(getNext()).toBeEnabled();
        });
    });

    describe('navigation', () => {
        let metricListener: jest.Mock;

        beforeEach(async () => {
            metricListener = jest.fn();
            findBar.addListener(VIEWER_EVENT.metric, metricListener);
            await openWithQuery('foo');
            emitMatchesCount({ current: 1, total: 3 });
            metricListener.mockClear();
        });

        test.each`
            name               | getButton              | findPrevious | metric
            ${'find_next'}     | ${() => getNext()}     | ${false}     | ${USER_DOCUMENT_FIND_EVENTS.NEXT}
            ${'find_previous'} | ${() => getPrevious()} | ${true}      | ${USER_DOCUMENT_FIND_EVENTS.PREVIOUS}
        `('should find again and emit a metric when $name is clicked', async ({ findPrevious, getButton, metric }) => {
            await userEvent.click(getButton());

            expectFindDispatch('again', 'foo', findPrevious);
            expect(dispatch).toBeCalledTimes(1);
            expect(metricListener).toBeCalledWith({ name: metric });
        });

        test.each`
            keys                 | getButton              | findPrevious | metric
            ${'{Enter}'}         | ${() => getNext()}     | ${false}     | ${USER_DOCUMENT_FIND_EVENTS.NEXT}
            ${'{Shift>}{Enter}'} | ${() => getPrevious()} | ${true}      | ${USER_DOCUMENT_FIND_EVENTS.PREVIOUS}
        `('should move focus and find again on $keys', async ({ findPrevious, getButton, keys, metric }) => {
            await userEvent.keyboard(keys);

            expect(getButton()).toHaveFocus();
            expectFindDispatch('again', 'foo', findPrevious);
            expect(dispatch).toBeCalledTimes(1);
            expect(metricListener).toBeCalledWith({ name: metric });
        });

        test('should find again once per Enter while a navigation button has focus', async () => {
            await userEvent.keyboard('{Enter}');
            dispatch.mockClear();

            await userEvent.keyboard('{Enter}');

            expectFindDispatch('again', 'foo', false);
            expect(dispatch).toBeCalledTimes(1);
        });

        test('should leave Enter on the close button to close the bar', async () => {
            act(() => getClose().focus());
            dispatch.mockClear();

            await userEvent.keyboard('{Enter}');

            expect(findBar.opened).toBe(false);
            expect(dispatch).not.toBeCalledWith('find', expect.objectContaining({ type: 'again' }));
        });

        test('should not find again on Enter while an IME composition is in progress', () => {
            // user-event cannot set isComposing
            fireEvent.keyDown(getInput(), { isComposing: true, key: 'Enter' });

            expect(getInput()).toHaveFocus();
            expect(dispatch).not.toBeCalled();
            expect(metricListener).not.toBeCalled();
        });

        test('should move focus to the field when a focused navigation button becomes disabled', async () => {
            await userEvent.keyboard('{Enter}');
            expect(getNext()).toHaveFocus();

            emitControlState(FindState.NOT_FOUND, { current: 0, total: 0 });

            expect(getNext()).toBeDisabled();
            expect(getInput()).toHaveFocus();
        });

        test('should re-enable navigation when a wrapped match follows a not found search', async () => {
            emitControlState(FindState.NOT_FOUND, { current: 0, total: 0 });
            dispatch.mockClear();

            emitControlState(FindState.WRAPPED, { current: 1, total: 2 });

            expect(screen.getByTestId('bp-DocFindBarV2-count')).toHaveTextContent('1 of 2');
            expect(getPrevious()).toBeEnabled();
            expect(getNext()).toBeEnabled();

            await userEvent.keyboard('{Enter}');

            expectFindDispatch('again', 'foo', false);
            expect(metricListener).toBeCalledWith({ name: USER_DOCUMENT_FIND_EVENTS.NEXT });
        });

        test('should not find again on Enter when nothing matches', async () => {
            emitControlState(FindState.NOT_FOUND, { current: 0, total: 0 });
            dispatch.mockClear();

            await userEvent.keyboard('{Enter}');

            expect(dispatch).not.toBeCalled();
            expect(metricListener).not.toBeCalled();
        });

        test('should show the find next tooltip on hover', async () => {
            await userEvent.hover(getNext());

            expect(await screen.findByRole('tooltip')).toHaveTextContent(__('find_next'));
        });
    });

    describe('open(), close(), and toggle()', () => {
        test('should show the bar, focus the field, and emit an open metric once', () => {
            const metricListener = jest.fn();
            findBar.addListener(VIEWER_EVENT.metric, metricListener);

            act(() => findBar.open());
            act(() => findBar.open());

            expect(findBar.opened).toBe(true);
            expect(findBar.findBarEl).not.toHaveClass(CLASS_HIDDEN);
            expect(getInput()).toHaveFocus();
            expect(metricListener).toBeCalledTimes(1);
            expect(metricListener).toBeCalledWith({ name: USER_DOCUMENT_FIND_EVENTS.OPEN });
        });

        test('should hide the bar, clear the search, and emit close', async () => {
            const closeListener = jest.fn();
            findBar.addListener('close', closeListener);
            await openWithQuery('foo');

            await userEvent.click(getClose());

            expect(findBar.opened).toBe(false);
            expect(findBar.findBarEl).toHaveClass(CLASS_HIDDEN);
            expect(getInput()).toHaveValue('');
            expectFindDispatch('find', '');
            expect(closeListener).toBeCalledTimes(1);
        });

        test('should restore and select the previous search when reopened', async () => {
            await openWithQuery('foo');
            act(() => findBar.close());
            dispatch.mockClear();

            act(() => findBar.open());

            const input = getInput() as HTMLInputElement;
            expect(input).toHaveValue('foo');
            expect(input.selectionStart).toBe(0);
            expect(input.selectionEnd).toBe(3);
            expectFindDispatch('find', 'foo');
        });

        test('should not emit close when the bar is already closed', () => {
            const closeListener = jest.fn();
            findBar.addListener('close', closeListener);

            act(() => findBar.close());

            expect(closeListener).not.toBeCalled();
            expectFindDispatch('find', '');
        });

        test('should toggle between open and closed', () => {
            act(() => findBar.toggle());
            expect(findBar.opened).toBe(true);

            act(() => findBar.toggle());
            expect(findBar.opened).toBe(false);
        });

        test('should show the close tooltip on hover', async () => {
            act(() => findBar.open());

            await userEvent.hover(getClose());

            expect(await screen.findByRole('tooltip')).toHaveTextContent(__('find_close'));
        });
    });

    describe('keyboard', () => {
        test.each(['Control', 'Meta'])('should open on %s+F and report the key as handled', modifier => {
            const event = new KeyboardEvent('keydown', {
                cancelable: true,
                ctrlKey: modifier === 'Control',
                key: 'f',
                metaKey: modifier === 'Meta',
            });

            let handled = false;
            act(() => {
                handled = findBar.onKeydown(event);
            });

            expect(handled).toBe(true);
            expect(event.defaultPrevented).toBe(true);
            expect(findBar.opened).toBe(true);
        });

        test('should ignore other keys', () => {
            expect(findBar.onKeydown(new KeyboardEvent('keydown', { key: 'a' }))).toBe(false);
            expect(findBar.opened).toBe(false);
        });

        test('should close on Escape without clearing the saved search or bubbling', async () => {
            const documentListener = jest.fn();
            await openWithQuery('foo');
            document.addEventListener('keydown', documentListener);

            await userEvent.keyboard('{Escape}');

            expect(findBar.opened).toBe(false);
            expect(findBar.prevSearchQuery).toBe('foo');
            expect(documentListener).not.toBeCalled();
            document.removeEventListener('keydown', documentListener);
        });

        test.each(['[', ']'])('should keep %s from reaching document shortcuts', async key => {
            const documentListener = jest.fn();
            document.addEventListener('keydown', documentListener);
            act(() => findBar.open());

            await userEvent.keyboard(`{${key}}`);

            expect(documentListener).not.toBeCalled();
            document.removeEventListener('keydown', documentListener);
        });
    });
});
