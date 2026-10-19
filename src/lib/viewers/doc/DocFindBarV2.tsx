import EventEmitter from 'events';
import React, { createRef, RefObject } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, Root } from 'react-dom/client';
import { IconButton, SearchInput, Text, Tooltip } from '@box/blueprint-web';
import { ChevronDown, ChevronUp, XMark } from '@box/blueprint-web-assets/icons/Medium';
import BlueprintProviders from '../../BlueprintProviders';
import { CLASS_HIDDEN } from '../../constants';
import { USER_DOCUMENT_FIND_EVENTS, VIEWER_EVENT } from '../../events';
import TabularDigits from '../../TabularDigits';
import { decodeKeydown, replacePlaceholders } from '../../util';
import './DocFindBarV2.scss';

// Mirrors pdf.js FindState
export const FindState = {
    FOUND: 0,
    NOT_FOUND: 1,
    WRAPPED: 2,
    PENDING: 3,
} as const;

export type FindStateValue = (typeof FindState)[keyof typeof FindState];

export type FindMatchesCount = {
    current: number;
    total: number;
};

export type FindEventPayloads = {
    updatefindcontrolstate: { matchesCount?: FindMatchesCount; state: FindStateValue };
    updatefindmatchescount: { matchesCount?: FindMatchesCount };
};

export type FindEventName = keyof FindEventPayloads;

export type FindEventListener<E extends FindEventName> = (payload: FindEventPayloads[E]) => void;

export type PdfEventBus = {
    dispatch: (eventName: 'find', data: object) => void;
    off: <E extends FindEventName>(eventName: E, listener: FindEventListener<E>) => void;
    on: <E extends FindEventName>(eventName: E, listener: FindEventListener<E>) => void;
};

export type PdfFindController = object;

type Props = {
    inputRef: RefObject<HTMLInputElement>;
    isNotFound: boolean;
    matchesCount: FindMatchesCount | null;
    nextButtonRef: RefObject<HTMLButtonElement>;
    onClose: () => void;
    onFindNext: () => void;
    onFindPrevious: () => void;
    onQueryChange: (query: string) => void;
    onQueryClear: () => void;
    previousButtonRef: RefObject<HTMLButtonElement>;
    query: string;
};

const canNavigateMatches = (query: string, isNotFound: boolean): boolean => !!query && !isNotFound;

const NO_MATCHES: FindMatchesCount = { current: 0, total: 0 };

const COUNT_SLOT_SIZER: FindMatchesCount = { current: 999, total: 999 };

const formatMatchesCount = ({ current, total }: FindMatchesCount): string =>
    replacePlaceholders(__('find_match_count'), [String(current), String(total)]);

export default function DocFindBarV2({
    inputRef,
    isNotFound,
    matchesCount,
    nextButtonRef,
    onClose,
    onFindNext,
    onFindPrevious,
    onQueryChange,
    onQueryClear,
    previousButtonRef,
    query,
}: Props): JSX.Element {
    const canNavigate = canNavigateMatches(query, isNotFound);
    const hasMatches = !!matchesCount && matchesCount.total > 0;
    let displayedCount: FindMatchesCount | null = null;
    if (hasMatches) {
        displayedCount = matchesCount;
    } else if (query && isNotFound) {
        displayedCount = NO_MATCHES;
    }

    return (
        <>
            <div className="bp-DocFindBarV2-search">
                <SearchInput.Controlled
                    ref={inputRef}
                    onChange={({ currentTarget }) => onQueryChange(currentTarget.value)}
                    onClearInput={onQueryClear}
                    searchInputAriaLabel={__('find_label')}
                    searchInputClearAriaLabel={__('search_clear')}
                    searchInputClearButtonTooltip={__('search_clear')}
                    value={query}
                />
            </div>
            <div className="bp-DocFindBarV2-count">
                <Text
                    aria-hidden
                    as="span"
                    className="bp-DocFindBarV2-countSizer"
                    color="textOnLightSecondary"
                    variant="bodyDefault"
                >
                    <TabularDigits>{formatMatchesCount(COUNT_SLOT_SIZER)}</TabularDigits>
                </Text>
                {displayedCount && (
                    <Text
                        as="span"
                        color="textOnLightSecondary"
                        data-testid="bp-DocFindBarV2-count"
                        variant="bodyDefault"
                    >
                        <TabularDigits>{formatMatchesCount(displayedCount)}</TabularDigits>
                    </Text>
                )}
            </div>
            <Tooltip content={__('find_previous')}>
                <IconButton
                    ref={previousButtonRef}
                    aria-label={__('find_previous')}
                    data-target-id="DocFindBarV2-previous"
                    disabled={!canNavigate}
                    icon={ChevronUp}
                    onClick={onFindPrevious}
                />
            </Tooltip>
            <Tooltip content={__('find_next')}>
                <IconButton
                    ref={nextButtonRef}
                    aria-label={__('find_next')}
                    data-target-id="DocFindBarV2-next"
                    disabled={!canNavigate}
                    icon={ChevronDown}
                    onClick={onFindNext}
                />
            </Tooltip>
            <Tooltip content={__('find_close')}>
                <IconButton
                    aria-label={__('find_close')}
                    data-target-id="DocFindBarV2-close"
                    icon={XMark}
                    onClick={onClose}
                />
            </Tooltip>
        </>
    );
}

type State = Pick<Props, 'isNotFound' | 'matchesCount' | 'query'>;

export class DocFindBarV2Root extends EventEmitter {
    readonly containerEl: HTMLElement;

    readonly eventBus: PdfEventBus;

    readonly findBarEl: HTMLElement;

    readonly findController: PdfFindController;

    readonly inputRef = createRef<HTMLInputElement>();

    isDestroyed = false;

    readonly nextButtonRef = createRef<HTMLButtonElement>();

    opened = false;

    prevSearchQuery = '';

    readonly previousButtonRef = createRef<HTMLButtonElement>();

    readonly root: Root;

    private state: State = {
        isNotFound: false,
        matchesCount: null,
        query: '',
    };

    constructor(containerEl: HTMLElement, findController: PdfFindController, eventBus: PdfEventBus) {
        super();

        if (!containerEl) {
            throw new Error('DocFindBar cannot be used without a container element.');
        }

        if (!eventBus) {
            throw new Error('DocFindBar cannot be used without an EventBus instance.');
        }

        if (!findController) {
            throw new Error('DocFindBar cannot be used without a PDFFindController instance.');
        }

        this.containerEl = containerEl;
        this.eventBus = eventBus;
        this.findController = findController;

        this.findBarEl = document.createElement('div');
        this.findBarEl.className = `bp-DocFindBarV2 ${CLASS_HIDDEN}`;
        this.findBarEl.setAttribute('data-testid', 'document-findbar');
        containerEl.appendChild(this.findBarEl);

        this.root = createRoot(this.findBarEl);
        // Captures so Escape saves the query and closes the bar before SearchInput can clear it
        this.findBarEl.addEventListener('keydown', this.handleFindBarKeyDown, true);
        this.eventBus.on('updatefindcontrolstate', this.handleFindControlState);
        this.eventBus.on('updatefindmatchescount', this.handleFindMatchesCount);

        this.render();
    }

    destroy(): void {
        this.isDestroyed = true;
        this.removeAllListeners();
        this.eventBus.off('updatefindcontrolstate', this.handleFindControlState);
        this.eventBus.off('updatefindmatchescount', this.handleFindMatchesCount);
        this.findBarEl.removeEventListener('keydown', this.handleFindBarKeyDown, true);
        this.root.unmount();
        this.findBarEl.remove();
    }

    dispatchFindEvent(type: string, findPrevious?: boolean): void {
        this.eventBus.dispatch('find', {
            query: this.state.query,
            phraseSearch: true,
            highlightAll: true,
            findPrevious,
            type,
        });
    }

    findFieldHandler = (): void => {
        this.dispatchFindEvent('find');
    };

    setFindFieldElValue(phrase: string): void {
        this.update({ query: phrase });
    }

    onKeydown(event: KeyboardEvent): boolean {
        const key = decodeKeydown(event).toLowerCase();
        switch (key) {
            case 'meta+f':
            case 'control+f':
            case 'meta+g':
            case 'control+g':
            case 'f3':
                this.open();
                event.preventDefault();
                return true;
            default:
                return false;
        }
    }

    open(): void {
        if (this.prevSearchQuery) {
            this.setFindFieldElValue(this.prevSearchQuery);
            this.findFieldHandler();
        }

        if (!this.opened) {
            this.opened = true;
            this.findBarEl.classList.remove(CLASS_HIDDEN);
            this.emit(VIEWER_EVENT.metric, { name: USER_DOCUMENT_FIND_EVENTS.OPEN });
        }

        this.inputRef.current?.select();
        this.inputRef.current?.focus();
    }

    close = (): void => {
        this.prevSearchQuery = this.state.query;
        this.setFindFieldElValue('');
        this.findFieldHandler();

        if (!this.opened) {
            return;
        }

        this.emit('close');
        this.opened = false;
        this.findBarEl.classList.add(CLASS_HIDDEN);
    };

    toggle(): void {
        if (this.opened) {
            this.close();
        } else {
            this.open();
        }
    }

    findAgain(findPrevious: boolean): void {
        if (!canNavigateMatches(this.state.query, this.state.isNotFound)) {
            return;
        }

        this.dispatchFindEvent('again', findPrevious);
        this.emit(VIEWER_EVENT.metric, {
            name: findPrevious ? USER_DOCUMENT_FIND_EVENTS.PREVIOUS : USER_DOCUMENT_FIND_EVENTS.NEXT,
        });
    }

    handleFindBarKeyDown = (event: KeyboardEvent): void => {
        const key = decodeKeydown(event).toLowerCase();
        switch (key) {
            case 'enter':
            case 'shift+enter': {
                if (event.isComposing) {
                    break;
                }

                const navigationTargets = [
                    this.inputRef.current,
                    this.nextButtonRef.current,
                    this.previousButtonRef.current,
                ];
                if (!navigationTargets.some(el => el === event.target)) {
                    break;
                }

                const findPrevious = key === 'shift+enter';
                const buttonRef = findPrevious ? this.previousButtonRef : this.nextButtonRef;
                event.preventDefault();
                buttonRef.current?.focus();
                this.findAgain(findPrevious);
                break;
            }
            case 'escape':
            case 'esc':
                if (!this.opened) {
                    return;
                }

                this.close();
                event.stopPropagation();
                event.preventDefault();
                break;
            case 'shift++':
            case 'shift+_':
            case '[':
            case ']':
                event.stopPropagation();
                break;
            default:
                break;
        }
    };

    handleFindControlState: FindEventListener<'updatefindcontrolstate'> = ({ matchesCount, state }) => {
        const isNotFound = state === FindState.PENDING ? this.state.isNotFound : state === FindState.NOT_FOUND;
        const hasNavigationFocus = [this.nextButtonRef.current, this.previousButtonRef.current].some(
            el => !!el && el === document.activeElement,
        );

        this.update({ isNotFound, matchesCount: matchesCount || null });

        if (isNotFound && hasNavigationFocus) {
            this.inputRef.current?.focus();
        }
    };

    handleFindMatchesCount: FindEventListener<'updatefindmatchescount'> = ({ matchesCount }) => {
        this.update({ matchesCount: matchesCount || null });
    };

    handleQueryChange = (query: string): void => {
        this.setFindFieldElValue(query);
        this.findFieldHandler();
    };

    // Returns focus to the input, since clearing unmounts the focused clear button
    handleQueryClear = (): void => {
        this.handleQueryChange('');
        this.inputRef.current?.focus();
    };

    update(nextState: Partial<State>): void {
        if (this.isDestroyed) {
            return;
        }

        this.state = { ...this.state, ...nextState };
        this.render();
    }

    render(): void {
        // Commits synchronously so open() can focus and select the input right after
        flushSync(() => {
            this.root.render(
                <BlueprintProviders container={this.containerEl}>
                    <DocFindBarV2
                        {...this.state}
                        inputRef={this.inputRef}
                        nextButtonRef={this.nextButtonRef}
                        onClose={this.close}
                        onFindNext={() => this.findAgain(false)}
                        onFindPrevious={() => this.findAgain(true)}
                        onQueryChange={this.handleQueryChange}
                        onQueryClear={this.handleQueryClear}
                        previousButtonRef={this.previousButtonRef}
                    />
                </BlueprintProviders>,
            );
        });
    }
}
