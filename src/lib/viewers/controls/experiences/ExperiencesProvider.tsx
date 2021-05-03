import React from 'react';
import ExperiencesContext from './ExperiencesContext';
import { TargetingApi } from '../../../types';

export type Props = React.PropsWithChildren<{
    experiences?: {
        [key: string]: TargetingApi;
    };
}>;

export default function ExperiencesProvider({ children, experiences = {} }: Props): JSX.Element {
    return <ExperiencesContext.Provider value={{ experiences }}>{children}</ExperiencesContext.Provider>;
}
