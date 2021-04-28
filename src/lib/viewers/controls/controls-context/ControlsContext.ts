import React from 'react';
import { TargetingApi } from '../../../types';

export type Context = {
    experiences: {
        [name: string]: TargetingApi;
    };
};

export default React.createContext<Context>({
    experiences: {},
});
