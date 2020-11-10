import React from 'react';
import Browser from '../../../Browser';
import { BROWSERS } from '../../../constants';
import { decodeKeydown } from '../../../util';
import fullscreen from '../../../Fullscreen';
import IconArrowDown24 from '../icons/IconArrowDown24';
import IconArrowUp24 from '../icons/IconArrowUp24';
import './PageControls.scss';

export type Props = {
    onPageChange: (arg0: number) => void;
    pageCount: number;
    pageNumber: number;
    viewer: HTMLElement;
};

export default function PageControls({ onPageChange, pageCount, pageNumber, viewer }: Props): JSX.Element {
    const isSafariFullscreen = Browser.getName() === 'Safari' && fullscreen.isFullscreen();
    const [isInputShown, setIsInputShown] = React.useState(false);
    const [tempPageNumber, setTempPageNumber] = React.useState(pageNumber.toString());
    const inputEl = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (inputEl && inputEl.current) {
            setTempPageNumber(pageNumber.toString());
            inputEl.current.focus();
        }
    }, [isInputShown, pageNumber]);

    const onPageNumInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setTempPageNumber(e.target.value);
    };

    const onPageNumInputBlur = (): void => {
        const newPageNumber = parseInt(tempPageNumber, 10);

        if (!Number.isNaN(newPageNumber)) {
            onPageChange(newPageNumber);
        }

        setIsInputShown(false);
    };

    const onPageNumInputKeydown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        const key = decodeKeydown(e);

        switch (key) {
            case 'Enter':
            case 'Tab':
                viewer.focus();
                // The keycode of the 'next' key on Android Chrome is 9, which maps to 'Tab'.
                // We normally trigger the blur handler by blurring the input
                // field, but this doesn't work for IE in fullscreen. For IE,
                // we blur the page behind the controls - this unfortunately
                // is an IE-only solution that doesn't work with other browsers

                if (Browser.getName() !== BROWSERS.INTERNET_EXPLORER && e.target) {
                    (e.target as HTMLInputElement).blur();
                }

                e.stopPropagation();
                e.preventDefault();
                break;

            case 'Escape':
                setIsInputShown(false);
                viewer.focus();

                e.stopPropagation();
                e.preventDefault();
                break;
            default:
                break;
        }
    };

    return (
        <div className="bp-PageControls">
            <button
                className="bp-PageControls-button"
                data-testid="bp-PageControls-previous"
                disabled={pageNumber === 1}
                onClick={(): void => onPageChange(pageNumber - 1)}
                title={__('previous_page')}
                type="button"
            >
                <IconArrowUp24 />
            </button>
            {!isInputShown && (
                <button
                    aria-label={__('enter_page_num')}
                    className="bp-PageControls-num-button"
                    onClick={(): void => setIsInputShown(true)}
                    title={__('enter_page_num')}
                    type="button"
                >
                    <span className="bp-PageControls-num-button-label">{`${pageNumber} / ${pageCount}`}</span>
                </button>
            )}
            {isInputShown && (
                <input
                    ref={inputEl}
                    aria-label={__('enter_page_num')}
                    className="bp-PageControls-num-input"
                    disabled={pageCount <= 1 || isSafariFullscreen}
                    min="1"
                    onBlur={onPageNumInputBlur}
                    onChange={onPageNumInputChange}
                    onKeyDown={onPageNumInputKeydown}
                    pattern="[0-9]*"
                    size={3}
                    title={__('enter_page_num')}
                    type="number"
                    value={tempPageNumber}
                />
            )}
            <button
                className="bp-PageControls-button"
                data-testid="bp-PageControls-next"
                disabled={pageNumber === pageCount}
                onClick={(): void => onPageChange(pageNumber + 1)}
                title={__('next_page')}
                type="button"
            >
                <IconArrowDown24 />
            </button>
        </div>
    );
}
