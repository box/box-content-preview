import React from 'react';
import PropTypes from 'prop-types';
import './SearchBar.scss';

class SearchBar extends React.PureComponent {
    static propTypes = {
        onSearch: PropTypes.func.isRequired,
        searchQuery: PropTypes.string.isRequired,
    };

    render() {
        const { onSearch, searchQuery } = this.props;
        const search = ({ currentTarget }) => onSearch(currentTarget.value);
        return (
            <div className="bp-SearchBar">
                <input
                    aria-label="search"
                    onChange={search}
                    placeholder={__('search_placeholder')}
                    type="search"
                    value={searchQuery}
                />
            </div>
        );
    }
}

export default SearchBar;
