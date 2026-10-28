import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TruncatedTextNoticeV2Root } from '../TruncatedTextNoticeV2';

describe('TruncatedTextNoticeV2Root', () => {
    let containerEl: HTMLElement;
    let notice: TruncatedTextNoticeV2Root;
    let onDownload: jest.Mock;

    beforeEach(() => {
        containerEl = document.createElement('div');
        document.body.appendChild(containerEl);
        onDownload = jest.fn();
        act(() => {
            notice = new TruncatedTextNoticeV2Root(containerEl, onDownload);
        });
    });

    afterEach(() => {
        act(() => notice.destroy());
        containerEl.remove();
    });

    test('should render the truncation message with a labeled notice icon inside the container', () => {
        const message = screen.getByText(__('text_truncated'));

        expect(containerEl).toContainElement(notice.hostEl);
        expect(notice.hostEl).toContainElement(message);
        expect(screen.getByRole('img', { name: __('notice_info') })).toBeInTheDocument();
    });

    test('should commit the notice before the constructor returns so a print snapshot includes it', () => {
        const reactGlobal = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
        const isActEnvironment = reactGlobal.IS_REACT_ACT_ENVIRONMENT;
        reactGlobal.IS_REACT_ACT_ENVIRONMENT = false;
        const syncNotice = new TruncatedTextNoticeV2Root(document.createElement('div'), jest.fn());

        try {
            expect(syncNotice.hostEl).toHaveTextContent(__('text_truncated'));
        } finally {
            syncNotice.destroy();
            reactGlobal.IS_REACT_ACT_ENVIRONMENT = isActEnvironment;
        }
    });

    test('should call the download handler when the download button is clicked', async () => {
        await userEvent.click(screen.getByRole('button', { name: __('download_file') }));

        expect(onDownload).toHaveBeenCalledTimes(1);
    });

    test('should tag the download button for analytics and print hiding', () => {
        const button = screen.getByRole('button', { name: __('download_file') });

        expect(button).toHaveAttribute('data-target-id', 'TruncatedTextNotice-download');
        expect(button).toHaveClass('bp-TruncatedTextNoticeV2-download');
    });

    test('should remove its host on destroy', () => {
        act(() => notice.destroy());

        expect(containerEl).not.toContainElement(notice.hostEl);
        expect(screen.queryByText(__('text_truncated'))).not.toBeInTheDocument();
    });
});
