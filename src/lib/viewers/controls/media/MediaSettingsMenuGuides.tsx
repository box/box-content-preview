import React from 'react';
import Settings, { Menu } from '../settings';

export enum Guide {
    OFF = 'off',
    R_16_9 = '16x9',
    R_9_16 = '9x16',
    R_1_1 = '1x1',
    R_4_5 = '4x5',
    R_2_39_1 = '2.39x1',
    R_2_1 = '2x1',
    R_1_85_1 = '1.85x1',
    R_2_35_1 = '2.35x1',
    R_4_3 = '4x3',
    R_21_9 = '21x9',
}

export type Props = {
    guide: Guide;
    isMaskEnabled: boolean;
    onGuideChange: (guide: Guide) => void;
    onMaskToggle: (isEnabled: boolean) => void;
};

const GUIDE_LABEL_MAP: Record<Guide, string> = {
    [Guide.OFF]: '',
    [Guide.R_16_9]: '16x9',
    [Guide.R_9_16]: '9x16',
    [Guide.R_1_1]: '1x1',
    [Guide.R_4_5]: '4x5',
    [Guide.R_2_39_1]: '2.39x1',
    [Guide.R_2_1]: '2.00x1',
    [Guide.R_1_85_1]: '1.85x1',
    [Guide.R_2_35_1]: '2.35x1',
    [Guide.R_4_3]: '4x3',
    [Guide.R_21_9]: '21x9',
};

const GUIDE_NAME_MAP: Record<Guide, string> = {
    [Guide.OFF]: __('media_guides_default') as string,
    [Guide.R_16_9]: __('media_guides_widescreen_hd') as string,
    [Guide.R_9_16]: __('media_guides_vertical') as string,
    [Guide.R_1_1]: __('media_guides_square') as string,
    [Guide.R_4_5]: __('media_guides_social_portrait') as string,
    [Guide.R_2_39_1]: __('media_guides_cinemascope') as string,
    [Guide.R_2_1]: __('media_guides_univisium') as string,
    [Guide.R_1_85_1]: __('media_guides_cinema_flat') as string,
    [Guide.R_2_35_1]: __('media_guides_scope') as string,
    [Guide.R_4_3]: __('media_guides_fullscreen') as string,
    [Guide.R_21_9]: __('media_guides_ultrawide') as string,
};

const GUIDE_ORDER: Guide[] = [
    Guide.OFF,
    Guide.R_16_9,
    Guide.R_9_16,
    Guide.R_1_1,
    Guide.R_4_5,
    Guide.R_2_39_1,
    Guide.R_2_1,
    Guide.R_1_85_1,
    Guide.R_2_35_1,
    Guide.R_4_3,
    Guide.R_21_9,
];

// Used as the value shown next to "Guides" in the main settings menu.
export const getLabel = (guide: Guide): string =>
    guide === Guide.OFF ? (__('media_guides_off') as string) : GUIDE_LABEL_MAP[guide];

const formatRadioLabel = (guide: Guide): string => {
    const ratio = guide === Guide.OFF ? (__('media_guides_off') as string) : GUIDE_LABEL_MAP[guide];
    return `${ratio} — ${GUIDE_NAME_MAP[guide]}`;
};

export default function MediaSettingsMenuGuides({
    guide,
    isMaskEnabled,
    onGuideChange,
    onMaskToggle,
}: Props): JSX.Element {
    const { setActiveMenu } = React.useContext(Settings.Context);

    const handleChange = (value: Guide): void => {
        setActiveMenu(Menu.MAIN);
        onGuideChange(value);
    };

    return (
        <Settings.Menu name={Menu.GUIDES}>
            <Settings.MenuBack label={__('media_guides')} />
            {GUIDE_ORDER.map(value => (
                <Settings.RadioItem<Guide>
                    key={value}
                    isSelected={guide === value}
                    label={formatRadioLabel(value)}
                    onChange={handleChange}
                    value={value}
                />
            ))}
            {guide !== Guide.OFF && (
                <Settings.CheckboxItem
                    isChecked={isMaskEnabled}
                    label={__('media_guides_show_mask')}
                    onChange={onMaskToggle}
                />
            )}
        </Settings.Menu>
    );
}
