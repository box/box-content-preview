import { replacePlaceholders } from '../../../util';

export type Shortcut = {
    // In the aria-keyshortcuts format
    keys: string;
    label: string;
};

// iPads report a Mac user agent, and their keyboards have the command key too
const isApplePlatform = (): boolean => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

// Preview binds its shortcuts to both Cmd and Ctrl, so each platform is shown the modifier its keyboard labels
export function getShortcut(key: string): Shortcut {
    return isApplePlatform()
        ? { keys: `Meta+${key}`, label: `⌘ + ${key}` }
        : { keys: `Control+${key}`, label: replacePlaceholders(__('controls_shortcut_ctrl'), [key]) };
}
