import React from 'react';
import { SearchInput } from '@box/blueprint-web';
import './SearchBarV2.scss';

export type Props = {
    onSearch: (query: string) => void;
    searchQuery: string;
};

export default function SearchBarV2({ onSearch, searchQuery }: Props): JSX.Element {
    return (
        <div className="bp-SearchBarV2">
            <SearchInput.Controlled
                data-resin-target="searchInput"
                data-testid="search-input"
                onChange={({ currentTarget }) => onSearch(currentTarget.value)}
                onClearInput={() => onSearch('')}
                placeholder={__('search_placeholder')}
                searchInputAriaLabel={__('search')}
                searchInputClearAriaLabel={__('search_clear')}
                value={searchQuery}
            />
        </div>
    );
}
