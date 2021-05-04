import React from 'react';
import ExperiencesContext from './ExperiencesContext';
import { Experiences } from '../../../types';

export type Props = React.PropsWithChildren<{
    experiences?: Experiences;
}>;

export default function ExperiencesProvider({ children, experiences = {} }: Props): JSX.Element {
    return <ExperiencesContext.Provider value={{ experiences }}>{children}</ExperiencesContext.Provider>;
}
