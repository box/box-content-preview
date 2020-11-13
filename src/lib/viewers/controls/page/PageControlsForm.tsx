import React from 'react';
import { decodeKeydown } from '../../../util';
import './PageControlsForm.scss';

export type Props = {
    onPageSubmit: (newPageNumber: number) => void;
    pageNumber: number;
    pageCount: number;
};

export const ENTER = 'Enter';
export const ESCAPE = 'Escape';

export default function PageControlsForm({ onPageSubmit, pageNumber, pageCount }: Props): JSX.Element {
    const [isInputShown, setIsInputShown] = React.useState(false);
    const [inputValue, setInputValue] = React.useState(pageNumber.toString());
    const [isButtonFocus, setIsButtonFocus] = React.useState(false);
    const buttonElRef = React.useRef<HTMLButtonElement>(null);
    const inputElRef = React.useRef<HTMLInputElement>(null);

    const setPage = (allowRetry = false): void => {
        const newPageNumber = parseInt(inputValue, 10);

        if (
            !Number.isNaN(newPageNumber) &&
            newPageNumber >= 1 &&
            newPageNumber <= pageCount &&
            newPageNumber !== pageNumber
        ) {
            onPageSubmit(newPageNumber);
        } else {
            setInputValue(pageNumber.toString()); // Reset the invalid input value to the current page

            if (allowRetry) {
                setIsButtonFocus(true);
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

                setIsInputShown(false);
                setIsButtonFocus(true);
                break;
            default:
                break;
        }
    };

    React.useEffect(() => {
        setInputValue(pageNumber.toString()); // Keep internal state in sync with prop as it changes
    }, [pageNumber]);

    React.useLayoutEffect(() => {
        if (buttonElRef.current && isButtonFocus) {
            buttonElRef.current.focus();
            setIsButtonFocus(false);
        }
    }, [isButtonFocus]);

    React.useLayoutEffect(() => {
        if (inputElRef.current && isInputShown) {
            inputElRef.current.select();
        }
    }, [isInputShown]);

    return (
        <div className="bp-PageControlsForm">
            {isInputShown ? (
                <input
                    ref={inputElRef}
                    className="bp-PageControlsForm-input"
                    data-testid="bp-PageControlsForm-input"
                    disabled={pageCount <= 1}
                    min="1"
                    onBlur={handleNumInputBlur}
                    onChange={handleNumInputChange}
                    onKeyDown={handleNumInputKeyDown}
                    pattern="[0-9]*"
                    size={3}
                    title={__('enter_page_num')}
                    type="number"
                    value={inputValue}
                />
            ) : (
                <button
                    ref={buttonElRef}
                    className="bp-PageControlsForm-button"
                    data-testid="bp-PageControlsForm-button"
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
