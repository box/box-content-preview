import React from 'react';
import { Experiences } from '../../../types';

export type Context = {
    experiences: Experiences;
};

export default React.createContext<Context>({
    experiences: {},
});
