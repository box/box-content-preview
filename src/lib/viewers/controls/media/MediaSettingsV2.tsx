import React from 'react';
import noop from 'lodash/noop';
import { DropdownMenu, Text } from '@box/blueprint-web';
import { ChevronLeft, ChevronRight } from '@box/blueprint-web-assets/icons/Medium';
import { bpIconIconOnLightSecondary, Size3 } from '@box/blueprint-web-assets/tokens/tokens';
import { settingsRadioItemAction } from '../settings/SettingsRadioItem';
import SettingsToggleV2 from '../settings/SettingsToggleV2';
import { stopEscapePropagation, stopKeyPropagation } from '../settings/stopMenuKeyPropagation';
import { addLabels } from './MediaSettingsAudioTracks';
import { formatRadioLabel, getLabel as getGuideLabel, Guide, GUIDE_ORDER } from './MediaSettingsMenuGuides';
import { getLabel as getQualityLabel, QUALITIES, Quality } from './MediaSettingsMenuQuality';
import { getLabel as getRateLabel, RATES } from './MediaSettingsMenuRate';
import { getDisplayLanguage } from './MediaSettingsMenuSubtitles';
import { Props as MediaSettingsProps } from './MediaSettings';
import { stopActivationKeyPropagation } from './utils';
import { Menu } from '../settings';
import { PortalContainerContext } from '../../../BlueprintProviders';
import { SUBTITLES_OFF } from '../../../constants';
import { decodeKeydown } from '../../../util';
import './MediaSettingsV2.scss';

export type Props = Omit<MediaSettingsProps, 'badge' | 'className' | 'onClose' | 'onOpen' | 'toggle'>;

type Option = {
    label: string;
    value: string;
};

type SubMenu = {
    isDisabled?: boolean;
    label: string;
    menu: Menu;
    onChange: (value: string) => void;
    options: Option[];
    testId: string;
    value: string;
    valueLabel: string;
};

const preventDefault = (event: Event): void => event.preventDefault();

export default function MediaSettingsV2({
    audioTrack,
    audioTracks = [],
    autoplay,
    guide = Guide.OFF,
    isGuidesEnabled,
    isHDSupported,
    onAudioTrackChange = noop,
    onAutoplayChange,
    onGuideChange = noop,
    onPlayNextChange,
    onQualityChange,
    onRateChange,
    onSubtitleChange,
    playNext = false,
    quality,
    rate,
    subtitle,
    subtitles = [],
}: Props): JSX.Element {
    const container = React.useContext(PortalContainerContext);
    const [activeMenu, setActiveMenu] = React.useState(Menu.MAIN);
    const [isOpen, setIsOpen] = React.useState(false);
    const contentRef = React.useRef<HTMLDivElement>(null);
    const focusSelectorRef = React.useRef<string>();
    const labelledAudioTracks = React.useMemo(() => addLabels(audioTracks), [audioTracks]);

    const subMenus: SubMenu[] = [
        {
            label: __('media_speed'),
            menu: Menu.RATE,
            onChange: onRateChange,
            options: RATES.map(value => ({ label: getRateLabel(value), value })),
            testId: 'speed',
            value: rate,
            valueLabel: getRateLabel(rate),
        },
    ];

    if (quality && onQualityChange) {
        subMenus.push({
            isDisabled: !isHDSupported,
            label: __('media_quality'),
            menu: Menu.QUALITY,
            onChange: value => onQualityChange(value as Quality),
            options: QUALITIES.map(value => ({ label: getQualityLabel(value), value })),
            testId: 'quality',
            value: quality,
            valueLabel: getQualityLabel(quality),
        });
    }

    if (subtitles.length > 0 && onSubtitleChange) {
        subMenus.push({
            label: `${__('subtitles')}/CC`,
            menu: Menu.SUBTITLES,
            onChange: value => onSubtitleChange(Number(value)),
            options: [
                { label: __('off'), value: String(SUBTITLES_OFF) },
                ...subtitles.map(({ displayLanguage, id }) => ({ label: displayLanguage, value: String(id) })),
            ],
            testId: 'subtitles',
            value: String(subtitle),
            valueLabel: getDisplayLanguage(subtitle, subtitles),
        });
    }

    if (labelledAudioTracks.length > 1) {
        subMenus.push({
            label: __('media_audio'),
            menu: Menu.AUDIO,
            onChange: value => onAudioTrackChange(Number(value)),
            options: labelledAudioTracks.map(({ id, label }) => ({ label, value: String(id) })),
            testId: 'audiotracks',
            value: String(audioTrack),
            valueLabel: labelledAudioTracks.find(({ id }) => id === audioTrack)?.label ?? '',
        });
    }

    if (isGuidesEnabled) {
        subMenus.push({
            label: __('media_guides'),
            menu: Menu.GUIDES,
            onChange: value => onGuideChange(value as Guide),
            options: GUIDE_ORDER.map(value => ({ label: formatRadioLabel(value), value })),
            testId: 'guides',
            value: guide,
            valueLabel: getGuideLabel(guide),
        });
    }

    const activeSubMenu = subMenus.find(({ menu }) => menu === activeMenu);

    const openSubMenu = (menu: Menu): void => {
        focusSelectorRef.current = '[role="menuitemradio"][data-state="checked"]';
        setActiveMenu(menu);
    };

    const closeSubMenu = (): void => {
        focusSelectorRef.current = `[data-menu="${activeMenu}"]`;
        setActiveMenu(Menu.MAIN);
    };

    const handleOpenChange = (open: boolean): void => {
        setIsOpen(open);
        setActiveMenu(Menu.MAIN);
    };

    const handleContentKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        const key = decodeKeydown(event);

        if (key === 'ArrowLeft' && activeSubMenu) {
            event.preventDefault();
            closeSubMenu();
        }

        stopKeyPropagation(event);
    };

    const handleEscapeKeyDown = (event: KeyboardEvent): void => {
        stopEscapePropagation(event);

        if (activeSubMenu) {
            event.preventDefault();
            closeSubMenu();
        }
    };

    const handleValueChange = (value: string): void => {
        window.Box?.Preview?.resin?.recordAction?.(settingsRadioItemAction);
        activeSubMenu?.onChange(value);
        closeSubMenu();
    };

    // Swapping views unmounts the focused item, so focus moves to the matching item in the new view.
    React.useEffect(() => {
        const selector = focusSelectorRef.current;
        focusSelectorRef.current = undefined;

        if (!selector || !contentRef.current) {
            return;
        }

        const target =
            contentRef.current.querySelector<HTMLElement>(selector) ||
            contentRef.current.querySelector<HTMLElement>('[role^="menuitem"]');
        target?.focus();
    }, [activeMenu]);

    return (
        <DropdownMenu.Root modal={false} onOpenChange={handleOpenChange} open={isOpen}>
            <DropdownMenu.Trigger asChild>
                <SettingsToggleV2
                    buttonType="icon"
                    data-target-id="MediaSettingsV2-toggle"
                    label={__('media_settings')}
                    onKeyDown={stopActivationKeyPropagation}
                    size="large"
                    variant="on-dark"
                />
            </DropdownMenu.Trigger>
            <DropdownMenu.Content
                ref={contentRef}
                align="end"
                className="bp-MediaSettingsV2"
                container={container}
                data-testid="bp-media-settings-v2"
                onEscapeKeyDown={handleEscapeKeyDown}
                onKeyDown={handleContentKeyDown}
                side="top"
            >
                {activeSubMenu ? (
                    <>
                        <DropdownMenu.Item
                            className="bp-MediaSettingsV2-back"
                            data-resin-target="settingsBack"
                            data-target-id="MediaSettingsV2-back"
                            data-testid="bp-media-settings-back"
                            onSelect={event => {
                                event.preventDefault();
                                closeSubMenu();
                            }}
                        >
                            <DropdownMenu.Item.StartElement icon={ChevronLeft} />
                            <DropdownMenu.Item.MainContent>
                                <Text as="span" variant="bodySmallSemibold">
                                    {activeSubMenu.label}
                                </Text>
                            </DropdownMenu.Item.MainContent>
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator />
                        <DropdownMenu.RadioGroup onValueChange={handleValueChange} value={activeSubMenu.value}>
                            {activeSubMenu.options.map(({ label, value }) => (
                                <DropdownMenu.RadioSelectItem
                                    key={value}
                                    data-resin-target="settingsRadioItem"
                                    onSelect={preventDefault}
                                    value={value}
                                >
                                    <Text as="span">{label}</Text>
                                </DropdownMenu.RadioSelectItem>
                            ))}
                        </DropdownMenu.RadioGroup>
                    </>
                ) : (
                    <>
                        <DropdownMenu.CheckboxItem
                            checked={autoplay}
                            data-resin-target={`settingsMenuItem-${Menu.AUTOPLAY}`}
                            data-target-id="MediaSettingsV2-autoplay"
                            data-testid="bp-media-settings-autoplay"
                            onCheckedChange={checked => onAutoplayChange(checked === true)}
                            onSelect={preventDefault}
                        >
                            <Text as="span">{__('media_autoplay')}</Text>
                        </DropdownMenu.CheckboxItem>
                        {onPlayNextChange && (
                            <DropdownMenu.CheckboxItem
                                checked={playNext}
                                data-resin-target={`settingsMenuItem-${Menu.PLAY_NEXT}`}
                                data-target-id="MediaSettingsV2-playNext"
                                data-testid="bp-media-settings-play-next"
                                onCheckedChange={checked => onPlayNextChange(checked === true)}
                                onSelect={preventDefault}
                            >
                                <Text as="span">{__('media_play_next')}</Text>
                            </DropdownMenu.CheckboxItem>
                        )}
                        <DropdownMenu.Separator />
                        {subMenus.map(({ isDisabled, label, menu, testId, valueLabel }) => (
                            <DropdownMenu.Item
                                key={menu}
                                data-menu={menu}
                                data-resin-target={`settingsMenuItem-${menu}`}
                                data-target-id={`MediaSettingsV2-${menu}`}
                                data-testid={`bp-media-settings-${testId}`}
                                disabled={isDisabled}
                                onKeyDown={event => {
                                    if (decodeKeydown(event) === 'ArrowRight') {
                                        event.preventDefault();
                                        openSubMenu(menu);
                                    }
                                }}
                                onSelect={event => {
                                    event.preventDefault();
                                    openSubMenu(menu);
                                }}
                            >
                                <DropdownMenu.Item.MainContent label={label} />
                                <DropdownMenu.Item.EndElement>
                                    <span className="bp-MediaSettingsV2-value">
                                        <Text as="span" color="textOnLightSecondary" variant="bodySmall">
                                            {valueLabel}
                                        </Text>
                                        {!isDisabled && (
                                            <ChevronRight
                                                aria-hidden
                                                color={bpIconIconOnLightSecondary}
                                                height={Size3}
                                                width={Size3}
                                            />
                                        )}
                                    </span>
                                </DropdownMenu.Item.EndElement>
                            </DropdownMenu.Item>
                        ))}
                    </>
                )}
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
}
