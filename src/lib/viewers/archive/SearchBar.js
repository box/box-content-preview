import React from 'react';
import PropTypes from 'prop-types';
import './SearchBar.scss';

const SearchBar = ({ onSearch, searchQuery }) => {
    return (
        <div className="bp-SearchBar">
            <input
                aria-label={__('search')}
                onChange={({ currentTarget }) => onSearch(currentTarget.value)}
                placeholder={__('search_placeholder')}
                type="search"
                value={searchQuery}
            />
        </div>
    );
};

SearchBar.propTypes = {
    onSearch: PropTypes.func.isRequired,
    searchQuery: PropTypes.string.isRequired,
};

export default SearchBar;
