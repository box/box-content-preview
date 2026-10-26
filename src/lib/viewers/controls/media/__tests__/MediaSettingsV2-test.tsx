import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import MediaSettingsV2, { Props } from '../MediaSettingsV2';
import { Guide } from '../MediaSettingsMenuGuides';
import { Quality } from '../MediaSettingsMenuQuality';
import { SUBTITLES_OFF } from '../../../../constants';
import { mockResizeObserver } from '../../__mocks__/resizeObserver';

describe('MediaSettingsV2', () => {
    const recordAction = jest.fn();
    let container: HTMLDivElement;

    beforeAll(() => {
        mockResizeObserver();
    });

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        window.Box = { Preview: { resin: { recordAction } } };
    });

    afterEach(() => {
        container.remove();
        delete window.Box;
    });

    const getWrapper = (props: Partial<Props> = {}) =>
        render(
            <MediaSettingsV2
                autoplay={false}
                onAutoplayChange={jest.fn()}
                onRateChange={jest.fn()}
                rate="1.0"
                {...props}
            />,
            {
                wrapper: ({ children }) => <BlueprintProviders container={container}>{children}</BlueprintProviders>,
            },
        );
    const getToggle = () => screen.getByRole('button', { name: __('media_settings') });
    const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
        await user.click(getToggle());
        return within(container).getByRole('menu');
    };

    test('should render a gear trigger that opens a menu portaled into the container', async () => {
        const user = userEvent.setup();
        getWrapper();

        expect(getToggle()).toHaveAttribute('data-resin-target', 'settingsOpen');
        expect(getToggle()).toHaveAttribute('aria-expanded', 'false');

        const menu = await openMenu(user);

        expect(getToggle()).toHaveAttribute('aria-expanded', 'true');
        expect(container).toContainElement(menu);
    });

    describe('flat checkbox items', () => {
        test.each([true, false])('should reflect autoplay=%s as a checkbox and toggle it in place', async autoplay => {
            const user = userEvent.setup();
            const onAutoplayChange = jest.fn();
            getWrapper({ autoplay, onAutoplayChange });

            const menu = await openMenu(user);
            const item = within(menu).getByRole('menuitemcheckbox', { name: __('media_autoplay') });

            expect(item).toHaveAttribute('aria-checked', String(autoplay));
            expect(item).toHaveAttribute('data-resin-target', 'settingsMenuItem-autoplay');

            await user.click(item);

            expect(onAutoplayChange).toHaveBeenCalledWith(!autoplay);
            expect(within(container).getByRole('menu')).toBeInTheDocument();
        });

        test('should render play next as a checkbox only when a handler is provided', async () => {
            const user = userEvent.setup();
            const onPlayNextChange = jest.fn();
            const { unmount } = getWrapper();

            expect(
                within(await openMenu(user)).queryByRole('menuitemcheckbox', { name: __('media_play_next') }),
            ).not.toBeInTheDocument();
            unmount();

            getWrapper({ onPlayNextChange, playNext: true });
            const item = within(await openMenu(user)).getByRole('menuitemcheckbox', { name: __('media_play_next') });

            expect(item).toHaveAttribute('aria-checked', 'true');
            await user.click(item);
            expect(onPlayNextChange).toHaveBeenCalledWith(false);
        });
    });

    test('should separate the checkbox items from the drill-in items with a divider', async () => {
        const user = userEvent.setup();
        getWrapper({ onPlayNextChange: jest.fn() });

        const menu = await openMenu(user);
        const children = Array.from(menu.children);
        const indexOf = (element: Element) => children.indexOf(element);
        const separatorIndex = indexOf(within(menu).getByRole('separator'));

        expect(indexOf(within(menu).getByRole('menuitemcheckbox', { name: __('media_play_next') }))).toBe(
            separatorIndex - 1,
        );
        expect(indexOf(within(menu).getByTestId('bp-media-settings-speed'))).toBe(separatorIndex + 1);
    });

    describe('drill-in submenus', () => {
        test('should show the current value on the main item and drill into the options', async () => {
            const user = userEvent.setup();
            getWrapper({ rate: '1.5' });

            const menu = await openMenu(user);
            const speedItem = within(menu).getByTestId('bp-media-settings-speed');

            expect(speedItem).toHaveTextContent(__('media_speed'));
            expect(speedItem).toHaveTextContent('1.5');

            await user.click(speedItem);

            expect(within(menu).getByTestId('bp-media-settings-back')).toHaveTextContent(__('media_speed'));
            expect(within(menu).queryByTestId('bp-media-settings-speed')).not.toBeInTheDocument();
            const radios = within(menu).getAllByRole('menuitemradio');
            expect(radios.map(radio => radio.textContent)).toEqual([
                '0.5',
                __('media_speed_normal'),
                '1.25',
                '1.5',
                '2.0',
            ]);
            expect(within(menu).getByRole('menuitemradio', { name: '1.5' })).toHaveAttribute('aria-checked', 'true');
            expect(within(menu).getByRole('menuitemradio', { name: '1.5' })).toHaveFocus();
        });

        test('should apply a selection, record the resin action, and return to the main menu', async () => {
            const user = userEvent.setup();
            const onRateChange = jest.fn();
            getWrapper({ onRateChange });

            const menu = await openMenu(user);
            await user.click(within(menu).getByTestId('bp-media-settings-speed'));
            await user.click(within(menu).getByRole('menuitemradio', { name: '2.0' }));

            expect(onRateChange).toHaveBeenCalledWith('2.0');
            expect(recordAction).toHaveBeenCalledWith({
                action: 'programmatic',
                component: 'toolbar',
                target: 'settingsRadioItem',
            });
            expect(within(menu).getByTestId('bp-media-settings-speed')).toHaveFocus();
        });

        test('should go back with the back item, ArrowLeft, and Escape without closing the menu', async () => {
            const user = userEvent.setup();
            getWrapper();

            const menu = await openMenu(user);
            const drillIn = async () => user.click(within(menu).getByTestId('bp-media-settings-speed'));

            await drillIn();
            await user.click(within(menu).getByTestId('bp-media-settings-back'));
            expect(within(menu).getByTestId('bp-media-settings-speed')).toHaveFocus();

            await drillIn();
            await user.keyboard('{ArrowLeft}');
            expect(within(menu).getByTestId('bp-media-settings-speed')).toBeInTheDocument();

            await drillIn();
            await user.keyboard('{Escape}');
            expect(within(menu).getByTestId('bp-media-settings-speed')).toBeInTheDocument();

            await user.keyboard('{Escape}');
            expect(within(container).queryByRole('menu')).not.toBeInTheDocument();
            expect(getToggle()).toHaveFocus();
        });

        test('should drill in with ArrowRight', async () => {
            const user = userEvent.setup();
            getWrapper();

            const menu = await openMenu(user);
            within(menu).getByTestId('bp-media-settings-speed').focus();
            await user.keyboard('{ArrowRight}');

            expect(within(menu).getByTestId('bp-media-settings-back')).toBeInTheDocument();
        });

        test('should reopen on the main menu after closing from a submenu', async () => {
            const user = userEvent.setup();
            getWrapper();

            await user.click(within(await openMenu(user)).getByTestId('bp-media-settings-speed'));
            await user.click(getToggle());
            const menu = await openMenu(user);

            expect(within(menu).getByTestId('bp-media-settings-speed')).toBeInTheDocument();
        });

        test('should list the qualities and pass back the selected one', async () => {
            const user = userEvent.setup();
            const onQualityChange = jest.fn();
            getWrapper({ isHDSupported: true, onQualityChange, quality: Quality.AUTO });

            const menu = await openMenu(user);
            await user.click(within(menu).getByTestId('bp-media-settings-quality'));

            expect(
                within(menu)
                    .getAllByRole('menuitemradio')
                    .map(radio => radio.textContent),
            ).toEqual(['480p', '1080p', __('media_quality_auto')]);
            await user.click(within(menu).getByRole('menuitemradio', { name: '1080p' }));
            expect(onQualityChange).toHaveBeenCalledWith(Quality.HD);
        });

        test('should disable quality when HD is not supported', async () => {
            const user = userEvent.setup();
            getWrapper({ isHDSupported: false, onQualityChange: jest.fn(), quality: Quality.SD });

            const item = within(await openMenu(user)).getByTestId('bp-media-settings-quality');

            expect(item).toHaveAttribute('aria-disabled', 'true');
            expect(item).toHaveTextContent('480p');
        });

        test('should list subtitles with an off option and pass back numeric ids', async () => {
            const user = userEvent.setup();
            const onSubtitleChange = jest.fn();
            getWrapper({
                onSubtitleChange,
                subtitle: SUBTITLES_OFF,
                subtitles: [
                    { displayLanguage: 'English', id: 0 },
                    { displayLanguage: 'Spanish', id: 1 },
                ],
            });

            const menu = await openMenu(user);
            await user.click(within(menu).getByTestId('bp-media-settings-subtitles'));

            expect(within(menu).getByRole('menuitemradio', { name: __('off') })).toHaveAttribute(
                'aria-checked',
                'true',
            );
            await user.click(within(menu).getByRole('menuitemradio', { name: 'Spanish' }));
            expect(onSubtitleChange).toHaveBeenCalledWith(1);
        });

        test('should list audio tracks only when there is more than one', async () => {
            const user = userEvent.setup();
            const onAudioTrackChange = jest.fn();
            getWrapper({
                audioTrack: 0,
                audioTracks: [
                    { id: 0, label: '', language: 'und', role: 'main' },
                    { id: 1, label: '', language: 'und', role: 'main' },
                ],
                onAudioTrackChange,
            });

            const menu = await openMenu(user);
            await user.click(within(menu).getByTestId('bp-media-settings-audiotracks'));
            await user.click(within(menu).getByRole('menuitemradio', { name: `${__('track')} 2` }));

            expect(onAudioTrackChange).toHaveBeenCalledWith(1);
        });

        test('should list guides when enabled', async () => {
            const user = userEvent.setup();
            const onGuideChange = jest.fn();
            getWrapper({ guide: Guide.OFF, isGuidesEnabled: true, onGuideChange });

            const menu = await openMenu(user);
            await user.click(within(menu).getByTestId('bp-media-settings-guides'));
            await user.click(within(menu).getAllByRole('menuitemradio')[1]);

            expect(onGuideChange).toHaveBeenCalledWith(Guide.R_16_9);
        });

        test('should hide optional submenus when their data or handlers are missing', async () => {
            const user = userEvent.setup();
            getWrapper();

            const menu = await openMenu(user);

            ['quality', 'subtitles', 'audiotracks', 'guides'].forEach(id => {
                expect(within(menu).queryByTestId(`bp-media-settings-${id}`)).not.toBeInTheDocument();
            });
        });
    });

    test.each(['{ArrowDown}', '{ArrowLeft}', '{ArrowRight}', ' '])(
        'should keep %s in the menu from reaching the viewer keydown handler',
        async key => {
            const user = userEvent.setup();
            const documentKeydown = jest.fn();
            getWrapper();

            await openMenu(user);
            document.addEventListener('keydown', documentKeydown);
            await user.keyboard(key);
            document.removeEventListener('keydown', documentKeydown);

            expect(documentKeydown).not.toHaveBeenCalled();
        },
    );

    test.each`
        view         | drillIn
        ${'main'}    | ${false}
        ${'submenu'} | ${true}
    `('should keep Escape in the $view view from reaching the host hotkeys', async ({ drillIn }) => {
        const user = userEvent.setup();
        const windowKeydown = jest.fn();
        getWrapper();

        const menu = await openMenu(user);
        if (drillIn) {
            await user.click(within(menu).getByTestId('bp-media-settings-speed'));
        }
        window.addEventListener('keydown', windowKeydown);
        await user.keyboard('{Escape}');
        window.removeEventListener('keydown', windowKeydown);

        expect(windowKeydown).not.toHaveBeenCalled();
    });
});
