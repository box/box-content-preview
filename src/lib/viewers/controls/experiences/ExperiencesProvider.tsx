import React from 'react';
import noop from 'lodash/noop';
import ExperiencesContext from './ExperiencesContext';
import { Experiences } from '../../../types';

export type Props = React.PropsWithChildren<{
    experiences?: Experiences;
    updateModeIfNecessary?: () => void;
}>;

export default function ExperiencesProvider({
    children,
    experiences = {},
    updateModeIfNecessary = noop,
}: Props): JSX.Element {
    return (
        <ExperiencesContext.Provider value={{ experiences, updateModeIfNecessary }}>
            {children}
        </ExperiencesContext.Provider>
    );
}
