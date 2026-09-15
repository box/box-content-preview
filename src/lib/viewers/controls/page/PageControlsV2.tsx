import React from 'react';
import { Toolbar, Tooltip } from '@box/blueprint-web';
import ChevronDown from '@box/blueprint-web-assets/icons/Medium/ChevronDown';
import ChevronUp from '@box/blueprint-web-assets/icons/Medium/ChevronUp';
import { decodeKeydown } from '../../../util';
import { ENTER, ESCAPE } from './PageControlsForm';
import { Props } from './PageControls';

export default function PageControlsV2({
    onPageChange,
    onPageSubmit,
    pageCount,
    pageNumber,
}: Props): JSX.Element | null {
    const [isInputShown, setIsInputShown] = React.useState(false);
    const [inputValue, setInputValue] = React.useState(pageNumber);

    const buttonElRef = React.useRef<HTMLButtonElement>(null);
    const inputElRef = React.useRef<HTMLInputElement>(null);
    const isRetryRef = React.useRef(false);

    const setPage = (allowRetry = false): void => {
        if (!Number.isNaN(inputValue) && inputValue >= 1 && inputValue <= pageCount && inputValue !== pageNumber) {
            onPageSubmit(inputValue);
        } else {
            setInputValue(pageNumber);

            if (allowRetry) {
                isRetryRef.current = true;
            }
        }

        setIsInputShown(false);
    };

    const handleNumInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        const key = decodeKeydown(event);

        switch (key) {
            case ENTER:
                event.stopPropagation();
                event.preventDefault();

                setPage(true);
                break;
            case ESCAPE:
                event.stopPropagation();
                event.preventDefault();

                isRetryRef.current = true;
                setIsInputShown(false);
                setInputValue(pageNumber);
                break;
            default:
                break;
        }
    };

    React.useEffect(() => {
        setInputValue(pageNumber);
    }, [pageNumber]);

    React.useLayoutEffect(() => {
        if (inputElRef.current && isInputShown) {
            inputElRef.current.select();
        }

        if (buttonElRef.current && !isInputShown) {
            if (isRetryRef.current) {
                buttonElRef.current.focus();
            }

            isRetryRef.current = false;
        }
    }, [isInputShown]);

    if (pageCount <= 1) {
        return null;
    }

    return (
        <>
            <Tooltip content={__('previous_page')}>
                <Toolbar.Button
                    aria-label={__('previous_page')}
                    data-resin-target="pagePrevious"
                    data-testid="bp-PageControls-previous"
                    disabled={pageNumber === 1}
                    onClick={(): void => onPageChange(pageNumber - 1)}
                >
                    <Toolbar.Icon icon={ChevronUp} />
                </Toolbar.Button>
            </Tooltip>
            {isInputShown ? (
                <Toolbar.Input
                    ref={inputElRef}
                    aria-label={__('enter_page_num')}
                    data-resin-target="pageNumberInput"
                    data-testid="bp-PageControlsForm-input"
                    inputMode="numeric"
                    onBlur={(): void => setPage()}
                    onChange={(event): void => setInputValue(parseInt(event.target.value, 10))}
                    onKeyDown={handleNumInputKeyDown}
                    size={3}
                    value={inputValue.toString()}
                />
            ) : (
                <Tooltip content={__('enter_page_num')}>
                    <Toolbar.Button
                        ref={buttonElRef}
                        aria-label={__('enter_page_num')}
                        className="bp-PageControlsV2-button"
                        data-resin-target="pageNumberOpen"
                        data-testid="bp-PageControlsForm-button"
                        disabled={pageCount <= 1}
                        onClick={(): void => setIsInputShown(true)}
                    >
                        {`${pageNumber} / ${pageCount}`}
                    </Toolbar.Button>
                </Tooltip>
            )}
            <Tooltip content={__('next_page')}>
                <Toolbar.Button
                    aria-label={__('next_page')}
                    data-resin-target="pageNext"
                    data-testid="bp-PageControls-next"
                    disabled={pageNumber === pageCount}
                    onClick={(): void => onPageChange(pageNumber + 1)}
                >
                    <Toolbar.Icon icon={ChevronDown} />
                </Toolbar.Button>
            </Tooltip>
        </>
    );
}
