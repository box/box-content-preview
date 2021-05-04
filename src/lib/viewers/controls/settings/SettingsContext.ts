import React from 'react';
import noop from 'lodash/noop';

export type Context = {
    activeMenu: Menu;
    activeRect?: Rect;
    setActiveMenu: (menu: Menu) => void;
    setActiveRect: (activeRect: Rect) => void;
};

export enum Menu {
    MAIN = 'main',
    AUTOPLAY = 'autoplay',
    RATE = 'rate',
}

export type Rect = ClientRect;

export default React.createContext<Context>({
    activeMenu: Menu.MAIN,
    setActiveMenu: noop,
    setActiveRect: noop,
});
