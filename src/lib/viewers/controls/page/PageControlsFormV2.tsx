import React from 'react';
import { Text, Toolbar, Tooltip } from '@box/blueprint-web';
import { decodeKeydown } from '../../../util';
import { ENTER, ESCAPE, Props } from './PageControlsForm';
import './PageControlsFormV2.scss';

export default function PageControlsFormV2({ onPageSubmit, pageNumber, pageCount }: Props): JSX.Element {
    const [isInputShown, setIsInputShown] = React.useState(false);
    // A string because Toolbar.Input only supports text types, so a parsed number would show "NaN" once cleared
    const [inputValue, setInputValue] = React.useState(pageNumber.toString());

    const buttonElRef = React.useRef<HTMLButtonElement>(null);
    const inputElRef = React.useRef<HTMLInputElement>(null);
    const isRetryRef = React.useRef(false);

    const setPage = (allowRetry = false): void => {
        const newPageNumber = Number(inputValue);

        if (
            Number.isInteger(newPageNumber) &&
            newPageNumber >= 1 &&
            newPageNumber <= pageCount &&
            newPageNumber !== pageNumber
        ) {
            onPageSubmit(newPageNumber);
        } else {
            setInputValue(pageNumber.toString()); // Reset the invalid input value to the current page

            if (allowRetry) {
                isRetryRef.current = true;
            }
        }

        setIsInputShown(false);
    };

    const handleNumInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        setInputValue(event.target.value);
    };

    const handleNumInputBlur = (): void => {
        setPage();
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
                setInputValue(pageNumber.toString());
                break;
            default:
                break;
        }
    };

    React.useEffect(() => {
        setInputValue(pageNumber.toString()); // Keep internal state in sync with prop as it changes
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

    return (
        <div className="bp-PageControlsFormV2" data-testid="bp-PageControlsForm">
            {isInputShown ? (
                <div className="bp-PageControlsFormV2-input">
                    <Toolbar.Input
                        ref={inputElRef}
                        aria-label={__('enter_page_num')}
                        data-resin-target="pageNumberInput"
                        data-testid="bp-PageControlsForm-input"
                        inputMode="numeric"
                        onBlur={handleNumInputBlur}
                        onChange={handleNumInputChange}
                        onKeyDown={handleNumInputKeyDown}
                        pattern="[0-9]*"
                        size={3}
                        value={inputValue}
                    />
                </div>
            ) : (
                <Tooltip content={__('enter_page_num')}>
                    <Toolbar.Button
                        ref={buttonElRef}
                        data-resin-target="pageNumberOpen"
                        data-testid="bp-PageControlsForm-button"
                        disabled={pageCount <= 1}
                        onClick={(): void => setIsInputShown(true)}
                    >
                        <span
                            className="bp-PageControlsFormV2-button-label"
                            data-testid="bp-PageControlsForm-button-label"
                        >
                            <Text as="span" color="textOnDarkDefault">{`${pageNumber} / ${pageCount}`}</Text>
                        </span>
                    </Toolbar.Button>
                </Tooltip>
            )}
        </div>
    );
}
