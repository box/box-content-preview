import React from 'react';
import IconArrowDown24 from '../icons/IconArrowDown24';
import IconArrowUp24 from '../icons/IconArrowUp24';
import PageControlsForm from './PageControlsForm';
import './PageControls.scss';

export type Props = {
    getViewer: () => HTMLElement;
    onPageChange: (newPageNumber: number) => void;
    pageCount: number;
    pageNumber: number;
};

export default function PageControls({ getViewer, onPageChange, pageCount, pageNumber }: Props): JSX.Element {
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
            <PageControlsForm
                getViewer={getViewer}
                onPageChange={onPageChange}
                pageCount={pageCount}
                pageNumber={pageNumber}
            />
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
