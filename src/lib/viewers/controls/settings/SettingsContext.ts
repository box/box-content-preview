import React from 'react';
import noop from 'lodash/noop';

export type Context = {
    activeMenu: Menu;
    setActiveMenu: (menu: Menu) => void;
    setActiveRect: (activeRect: Rect) => void;
};

export enum Menu {
    MAIN = 'main',
    AUDIO = 'audio',
    AUTOPLAY = 'autoplay',
    QUALITY = 'quality',
    RATE = 'rate',
    SUBTITLES = 'subtitles',
}

export type Rect = ClientRect;

export default React.createContext<Context>({
    activeMenu: Menu.MAIN,
    setActiveMenu: noop,
    setActiveRect: noop,
});
