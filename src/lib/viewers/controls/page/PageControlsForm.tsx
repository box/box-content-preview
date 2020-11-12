import React from 'react';
import Browser from '../../../Browser';
import { BROWSERS } from '../../../constants';
import { decodeKeydown } from '../../../util';
import './PageControlsForm.scss';

export type Props = {
    getViewer: () => HTMLElement;
    onPageChange: (newPageNumber: number) => void;
    pageNumber: number;
    pageCount: number;
};

export default function PageControlsForm({ getViewer, onPageChange, pageNumber, pageCount }: Props): JSX.Element {
    const [isInputShown, setIsInputShown] = React.useState(false);
    const [pageInputValue, setPageInputValue] = React.useState(pageNumber.toString());
    const inputElRef = React.useRef<HTMLInputElement>(null);
    const viewer = getViewer();

    React.useEffect(() => {
        if (inputElRef && inputElRef.current) {
            setPageInputValue(pageNumber.toString());
            inputElRef.current.focus();
        }
    }, [isInputShown, pageNumber]);

    const handleNumInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        setPageInputValue(event.target.value);
    };

    const handleNumInputBlur = (): void => {
        const newPageNumber = parseInt(pageInputValue, 10);

        if (!Number.isNaN(newPageNumber)) {
            onPageChange(newPageNumber);
        }

        setIsInputShown(false);
    };

    const handleNumInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        const key = decodeKeydown((event as unknown) as Event);

        switch (key) {
            case 'Enter':
            case 'Tab':
                viewer.focus();
                // The keycode of the 'next' key on Android Chrome is 9, which maps to 'Tab'.
                // We normally trigger the blur handler by blurring the input
                // field, but this doesn't work for IE in fullscreen. For IE,
                // we blur the page behind the controls - this unfortunately
                // is an IE-only solution that doesn't work with other browsers

                if (Browser.getName() !== BROWSERS.INTERNET_EXPLORER) {
                    (event.target as HTMLInputElement).blur();
                }

                event.stopPropagation();
                event.preventDefault();
                break;

            case 'Escape':
                setIsInputShown(false);
                viewer.focus();

                event.stopPropagation();
                event.preventDefault();
                break;
            default:
                break;
        }
    };

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
                    value={pageInputValue}
                />
            ) : (
                <button
                    className="bp-PageControlsForm-button"
                    data-testid="bp-PageControlsForm-button"
                    onClick={(): void => setIsInputShown(true)}
                    title={__('enter_page_num')}
                    type="button"
                >
                    <span
                        className="bp-PageControlsForm-button-label"
                        data-testid="bp-PageControlsForm-button-span"
                    >{`${pageNumber} / ${pageCount}`}</span>
                </button>
            )}
        </div>
    );
}
