import React from 'react';
import { Text, Toolbar, Tooltip, VisuallyHidden } from '@box/blueprint-web';
import ControlsLayerContext from '../controls-layer/ControlsLayerContext';
import TabularDigits from '../../../TabularDigits';
import { decodeKeydown } from '../../../util';
import { ENTER, ESCAPE, Props } from './PageControlsForm';
import './PageControlsFormV2.scss';

export default function PageControlsFormV2({ onPageSubmit, pageNumber, pageCount }: Props): JSX.Element {
    const { setIsEditing } = React.useContext(ControlsLayerContext);
    const [isInputShown, setIsInputShown] = React.useState(false);
    // A string because Toolbar.Input only supports text types, so a parsed number would show "NaN" once cleared
    const [inputValue, setInputValue] = React.useState(pageNumber.toString());
    // The input takes the button's size, so the bar keeps its width and height while the page number is edited
    const [inputSize, setInputSize] = React.useState<React.CSSProperties>();

    const buttonElRef = React.useRef<HTMLButtonElement>(null);
    const inputElRef = React.useRef<HTMLInputElement>(null);
    const isRetryRef = React.useRef(false);

    const pageLabel = `${pageNumber} / ${pageCount}`;

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

    const handleButtonClick = (): void => {
        const rect = buttonElRef.current?.getBoundingClientRect();

        setInputSize(rect?.width ? { height: rect.height, width: rect.width } : undefined);
        setIsInputShown(true);
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

    // Keeps the bar and the input up while typing, even once the cursor leaves the bar
    React.useEffect(() => {
        setIsEditing(isInputShown);

        return (): void => setIsEditing(false);
    }, [isInputShown, setIsEditing]);

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
                <div className="bp-PageControlsFormV2-input" style={inputSize}>
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
                        className="bp-ControlsPillV2-label"
                        data-resin-target="pageNumberOpen"
                        data-testid="bp-PageControlsForm-button"
                        disabled={pageCount <= 1}
                        onClick={handleButtonClick}
                    >
                        <span
                            className="bp-PageControlsFormV2-button-label"
                            data-testid="bp-PageControlsForm-button-label"
                        >
                            <Text
                                as="span"
                                className="bp-ControlsPillV2-text"
                                color="textOnDarkDefault"
                                variant="bodyDefaultSemibold"
                            >
                                {/* Screen readers would read the fixed-width digits one by one */}
                                <span aria-hidden>
                                    <TabularDigits>{pageLabel}</TabularDigits>
                                </span>
                                <VisuallyHidden>{pageLabel}</VisuallyHidden>
                            </Text>
                        </span>
                    </Toolbar.Button>
                </Tooltip>
            )}
        </div>
    );
}
