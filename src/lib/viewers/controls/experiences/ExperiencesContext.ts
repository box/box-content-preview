import React from 'react';
import noop from 'lodash/noop';
import { Experiences } from '../../../types';

export type Context = {
    experiences: Experiences;
    updateModeIfNecessary: () => void;
};

export default React.createContext<Context>({
    experiences: {},
    updateModeIfNecessary: noop,
});
