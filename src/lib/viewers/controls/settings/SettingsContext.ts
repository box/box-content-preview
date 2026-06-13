import React from 'react';
import noop from 'lodash/noop';

export enum Menu {
    MAIN = 'main',
    AUDIO = 'audio',
    AUTOPLAY = 'autoplay',
    GUIDES = 'guides',
    QUALITY = 'quality',
    RATE = 'rate',
    SUBTITLES = 'subtitles',
}

export type Rect = ClientRect;

export type Context = {
    activeMenu: Menu;
    setActiveMenu: (menu: Menu) => void;
    setActiveRect: (activeRect: Rect) => void;
};

export default React.createContext<Context>({
    activeMenu: Menu.MAIN,
    setActiveMenu: noop,
    setActiveRect: noop,
});
