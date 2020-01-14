import React from 'react';
import PropTypes from 'prop-types';
import Breadcrumb from 'box-ui-elements/es/components/breadcrumb';
import PlainButton from 'box-ui-elements/es/components/plain-button/PlainButton';
import { ROOT_FOLDER, VIEWS } from './constants';
import './Breadcrumbs.scss';

class Breadcrumbs extends React.PureComponent {
    static propTypes = {
        filename: PropTypes.string.isRequired,
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
        const { filename } = this.props;
        const pathNames = fullPath === ROOT_FOLDER ? [] : fullPath.split('/').slice(0, -1);
        const getPath = index => pathNames.slice(0, index + 1).join('/');
        const pathItems = pathNames.map((name, index) => ({
            name,
            path: `${getPath(index)}/`,
        }));
        return [{ name: filename, path: ROOT_FOLDER }, ...pathItems];
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
