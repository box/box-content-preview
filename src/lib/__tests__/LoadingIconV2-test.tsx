import React from 'react';
import { act, render, screen } from '@testing-library/react';

import { bpBoxBlue100 } from '@box/blueprint-web-assets/tokens/tokens';
import { FILE_CATEGORY_COLORS } from '@box/item-icon';

import { LoadingIconV2, LoadingIconV2Root } from '../LoadingIconV2';

describe('LoadingIconV2', () => {
    const getRingColor = (): string | undefined =>
        screen
            .getByRole('progressbar')
            .querySelector<HTMLElement>('.bp-LoadingIconV2-ring')
            ?.style.getPropertyValue('--bp-loading-icon-ring-color');

    test.each`
        extension    | ringColor
        ${'mp3'}     | ${FILE_CATEGORY_COLORS.audio}
        ${'pdf'}     | ${FILE_CATEGORY_COLORS.pdf}
        ${'PDF'}     | ${FILE_CATEGORY_COLORS.pdf}
        ${'unknown'} | ${bpBoxBlue100}
        ${undefined} | ${bpBoxBlue100}
    `('should color the ring $ringColor for extension $extension', ({ extension, ringColor }) => {
        render(<LoadingIconV2 extension={extension} />);

        expect(screen.getByRole('progressbar', { name: __('loading_preview') })).toHaveClass('bp-LoadingIconV2--light');
        expect(getRingColor()).toBe(ringColor);
    });

    test('should use the dark theme for video files', () => {
        render(<LoadingIconV2 extension="mp4" />);

        expect(screen.getByRole('progressbar')).toHaveClass('bp-LoadingIconV2--dark');
    });

    test('should render the file type icon hidden from assistive technology', () => {
        render(<LoadingIconV2 extension="pdf" />);

        expect(screen.getByRole('progressbar').querySelector('svg.bp-LoadingIconV2-icon')).toHaveAttribute(
            'aria-hidden',
            'true',
        );
    });
});

describe('LoadingIconV2Root', () => {
    let containerEl: HTMLElement;
    let loadingIcon: LoadingIconV2Root;

    beforeEach(() => {
        containerEl = document.createElement('div');
        document.body.appendChild(containerEl);
        loadingIcon = new LoadingIconV2Root({ containerEl });
    });

    afterEach(() => {
        containerEl.remove();
    });

    test('should render the loading icon and unmount it on destroy', () => {
        act(() => loadingIcon.render('pdf'));

        expect(screen.getByRole('progressbar', { name: __('loading_preview') })).toBeVisible();

        act(() => loadingIcon.destroy());

        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
});
