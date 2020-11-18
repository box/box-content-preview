import React from 'react';
import { decodeKeydown } from '../../../util';
import './PageControlsForm.scss';

export type Props = {
    onPageSubmit: (newPageNumber: number) => void;
    pageCount: number;
    pageNumber: number;
};

export const ENTER = 'Enter';
export const ESCAPE = 'Escape';

export default function PageControlsForm({ onPageSubmit, pageNumber, pageCount }: Props): JSX.Element {
    const [isInputShown, setIsInputShown] = React.useState(false);
    const [inputValue, setInputValue] = React.useState(pageNumber);

    const buttonElRef = React.useRef<HTMLButtonElement>(null);
    const inputElRef = React.useRef<HTMLInputElement>(null);
    const isRetryRef = React.useRef(false);

    const setPage = (allowRetry = false): void => {
        if (!Number.isNaN(inputValue) && inputValue >= 1 && inputValue <= pageCount && inputValue !== pageNumber) {
            onPageSubmit(inputValue);
        } else {
            setInputValue(pageNumber); // Reset the invalid input value to the current page

            if (allowRetry) {
                isRetryRef.current = true;
            }
        }

        setIsInputShown(false);
    };

    const handleNumInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        setInputValue(parseInt(event.target.value, 10));
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
                setInputValue(pageNumber);
                break;
            default:
                break;
        }
    };

    React.useEffect(() => {
        setInputValue(pageNumber); // Keep internal state in sync with prop as it changes
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
        <div className="bp-PageControlsForm">
            {isInputShown ? (
                <input
                    ref={inputElRef}
                    className="bp-PageControlsForm-input"
                    data-testid="bp-PageControlsForm-input"
                    min="1"
                    onBlur={handleNumInputBlur}
                    onChange={handleNumInputChange}
                    onKeyDown={handleNumInputKeyDown}
                    pattern="[0-9]*"
                    size={3}
                    title={__('enter_page_num')}
                    type="number"
                    value={inputValue.toString()}
                />
            ) : (
                <button
                    ref={buttonElRef}
                    className="bp-PageControlsForm-button"
                    data-testid="bp-PageControlsForm-button"
                    disabled={pageCount <= 1}
                    onClick={(): void => setIsInputShown(true)}
                    title={__('enter_page_num')}
                    type="button"
                >
                    <span
                        className="bp-PageControlsForm-button-label"
                        data-testid="bp-PageControlsForm-button-label"
                    >{`${pageNumber} / ${pageCount}`}</span>
                </button>
            )}
        </div>
    );
}
