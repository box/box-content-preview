import React from 'react';
import IconChevronUpMedium24 from '../icons/IconChevronUpMedium24';
import IconChevronDownMedium24 from '../icons/IconChevronDownMedium24';
import PageControlsForm from './PageControlsForm';
import './PageControls.scss';

export type Props = {
    onPageChange: (newPageNumber: number) => void;
    onPageSubmit: (newPageNumber: number) => void;
    pageCount: number;
    pageNumber: number;
};

export default function PageControls({ onPageChange, onPageSubmit, pageCount, pageNumber }: Props): JSX.Element | null {
    if (pageCount <= 1) {
        return null;
    }

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
                <IconChevronUpMedium24 />
            </button>
            <PageControlsForm onPageSubmit={onPageSubmit} pageCount={pageCount} pageNumber={pageNumber} />
            <button
                className="bp-PageControls-button"
                data-testid="bp-PageControls-next"
                disabled={pageNumber === pageCount}
                onClick={(): void => onPageChange(pageNumber + 1)}
                title={__('next_page')}
                type="button"
            >
                <IconChevronDownMedium24 />
            </button>
        </div>
    );
}
