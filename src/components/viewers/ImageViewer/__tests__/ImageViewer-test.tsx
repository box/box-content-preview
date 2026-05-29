import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageViewer from '../ImageViewer';

const fileResponse = {
    id: '123',
    type: 'file',
    name: 'cat.png',
    representations: {
        entries: [
            {
                representation: 'webp',
                status: { state: 'success' },
                content: { url_template: 'https://dl.boxcloud.com/api/2.0/files/123/content/cat.webp{+asset_path}' },
                info: { url: 'https://api.box.com/2.0/files/123/representations/webp' },
            },
        ],
    },
};

describe('ImageViewer', () => {
    beforeEach(() => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => fileResponse,
        }) as typeof fetch;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('shows loading state, then renders image when representation resolves', async () => {
        render(<ImageViewer fileId="123" token="abc" />);
        expect(screen.getByTestId('bp-ImageViewer-loading')).toBeInTheDocument();
        await waitFor(() => expect(screen.getByTestId('bp-ImageViewer-image')).toBeInTheDocument());
        const img = screen.getByTestId('bp-ImageViewer-image') as HTMLImageElement;
        expect(img.src).toContain('cat.webp');
        expect(img.alt).toBe('cat.png');
    });

    test('renders error state and retry when fetch fails', async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as typeof fetch;
        render(<ImageViewer fileId="123" token="abc" />);
        await waitFor(() => expect(screen.getByTestId('bp-ImageViewer-error')).toBeInTheDocument());
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    test('fires onLoad once representation resolves', async () => {
        const onLoad = jest.fn();
        render(<ImageViewer fileId="123" onLoad={onLoad} token="abc" />);
        await waitFor(() => expect(onLoad).toHaveBeenCalled());
    });

    test('fires onError on representation failure', async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as typeof fetch;
        const onError = jest.fn();
        render(<ImageViewer fileId="123" onError={onError} token="abc" />);
        await waitFor(() => expect(onError).toHaveBeenCalled());
    });

    test('zoom in button increases image transform scale', async () => {
        render(<ImageViewer fileId="123" token="abc" />);
        await waitFor(() => screen.getByTestId('bp-ImageViewer-image'));
        const img = screen.getByTestId('bp-ImageViewer-image') as HTMLImageElement;
        const initialTransform = img.style.transform;
        await userEvent.click(screen.getByRole('button', { name: /zoom in/i }));
        expect(img.style.transform).not.toBe(initialTransform);
        expect(img.style.transform).toContain('scale(1.25)');
    });

    test('rotate button rotates the image -90 degrees', async () => {
        render(<ImageViewer fileId="123" token="abc" />);
        await waitFor(() => screen.getByTestId('bp-ImageViewer-image'));
        await userEvent.click(screen.getByRole('button', { name: /rotate left/i }));
        const img = screen.getByTestId('bp-ImageViewer-image') as HTMLImageElement;
        expect(img.style.transform).toContain('rotate(-90deg)');
    });
});
