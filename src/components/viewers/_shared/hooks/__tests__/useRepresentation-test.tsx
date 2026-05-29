import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import useRepresentation, { UseRepresentationResult } from '../useRepresentation';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Harness({ onReady, ...rest }: any): null {
    const api = useRepresentation(rest);
    React.useEffect(() => {
        onReady(api);
    });
    return null;
}

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

describe('useRepresentation', () => {
    let api: UseRepresentationResult;
    const setApi = (next: UseRepresentationResult): void => {
        api = next;
    };

    beforeEach(() => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => fileResponse,
        }) as typeof fetch;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('resolves to ready with src when representation is success', async () => {
        render(<Harness fileId="123" onReady={setApi} representationType="webp" token="abc" />);
        await waitFor(() => expect(api.status).toBe('ready'));
        expect(api.src).toContain('cat.webp');
        expect(api.src).toContain('access_token=abc');
        expect(api.file?.name).toBe('cat.png');
    });

    test('errors when no matching representation exists', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ id: '123', type: 'file', representations: { entries: [] } }),
        }) as typeof fetch;
        render(<Harness fileId="123" onReady={setApi} representationType="webp" token="abc" />);
        await waitFor(() => expect(api.status).toBe('error'));
        expect(api.error?.code).toBe('representation_unavailable');
    });

    test('resolves token function before fetching', async () => {
        const tokenFn = jest.fn().mockResolvedValue('async-token');
        render(<Harness fileId="123" onReady={setApi} representationType="webp" token={tokenFn} />);
        await waitFor(() => expect(api.status).toBe('ready'));
        expect(tokenFn).toHaveBeenCalled();
        expect(api.src).toContain('access_token=async-token');
    });

    test('reports fetch failure as error state', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 404,
        }) as typeof fetch;
        render(<Harness fileId="123" onReady={setApi} representationType="webp" token="abc" />);
        await waitFor(() => expect(api.status).toBe('error'));
        expect(api.error?.code).toBe('fetch_file_failed');
    });
});
