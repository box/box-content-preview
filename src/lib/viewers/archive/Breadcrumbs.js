import React from 'react';
import PropTypes from 'prop-types';
import Breadcrumb from 'box-ui-elements/es/components/breadcrumb';
import PlainButton from 'box-ui-elements/es/components/plain-button/PlainButton';
import { VIEWS } from './constants';
import './Breadcrumbs.scss';

class Breadcrumbs extends React.PureComponent {
    static propTypes = {
        fullPath: PropTypes.string.isRequired,
        onClick: PropTypes.func.isRequired,
        view: PropTypes.string.isRequired,
    };

    /**
     * Split full path string to path items
     *
     * @param {string} fullPath - Full path for current folder
     * @return {Array<Object>} path items including name and path string
     */
    getPathItems = fullPath => {
        const pathNames = fullPath.split('/').slice(0, -1);
        // join path names from root to current index to get absolute path
        const getAbsolutePath = index => pathNames.slice(0, index + 1).join('/');

        return pathNames.map((name, index) => ({
            name,
            path: `${getAbsolutePath(index)}/`,
        }));
    };

    /**
     * render breadcrumbs
     *
     * @return {jsx} Breadcrumbs
     */
    render() {
        const { fullPath, onClick, view } = this.props;

        return (
            <div className="bp-Breadcrumbs">
                <Breadcrumb>
                    {view === VIEWS.VIEW_SEARCH ? (
                        <span>{__('search_results')}</span>
                    ) : (
                        this.getPathItems(fullPath).map(pathItem => (
                            <PlainButton
                                key={pathItem.path}
                                data-resin-target="breadcrumb"
                                onClick={() => onClick(pathItem.path)}
                                type="button"
                            >
                                {pathItem.name}
                            </PlainButton>
                        ))
                    )}
                </Breadcrumb>
            </div>
        );
    }
}

export default Breadcrumbs;
