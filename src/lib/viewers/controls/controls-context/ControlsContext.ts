import React from 'react';

export type Context = {
    experiences: {
        [name: string]: {
            canShow: boolean;
            onClose: () => void;
            onComplete: () => void;
            onShow: () => void;
        };
    };
};

export default React.createContext<Context>({
    experiences: {},
});
