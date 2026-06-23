/* eslint-disable no-unused-expressions */
import TimestampedCommentsAPI from '../timestampedCommentsAPI';
import Api from '../api';

let stubs = {};

describe('timestampedCommentsAPI', () => {
    beforeEach(() => {
        stubs = {};
        stubs.timestampedCommentsAPI = new TimestampedCommentsAPI(new Api());
        stubs.get = jest.spyOn(Api.prototype, 'get').mockImplementation();
    });

    describe('getURL()', () => {
        test('Should build a file_activities URL with the expected query params', () => {
            const url = TimestampedCommentsAPI.getURL('123', 'https://api.box.com');
            expect(url).toContain('https://api.box.com/2.0/file_activities');
            expect(url).toContain('file_id=123');
            expect(url).toContain('activity_types=enhanced_comment,task,versions');
            expect(url).toContain('enable_replies=true');
            expect(url).toContain('reply_limit=1000');
        });
    });

    describe('parseResponse()', () => {
        test('Should return an empty array when response is missing or has no entries', () => {
            expect(TimestampedCommentsAPI.parseResponse(undefined)).toEqual([]);
            expect(TimestampedCommentsAPI.parseResponse({})).toEqual([]);
            expect(TimestampedCommentsAPI.parseResponse({ entries: [] })).toEqual([]);
        });

        test('Should keep enhanced_comment entries with a timestamp prefix and strip the prefix', () => {
            const response = {
                entries: [
                    {
                        activity_type: 'enhanced_comment',
                        source: {
                            enhanced_comment: {
                                created_at: '2026-06-17T15:48:11-07:00',
                                created_by: { avatar_url: 'https://example.com/a.png', name: 'Alex Park' },
                                id: '490977',
                                message: '#[timestamp:24600,versionId:40815299067] hello',
                            },
                        },
                    },
                ],
            };

            const result = TimestampedCommentsAPI.parseResponse(response);

            expect(result).toEqual([
                {
                    createdAt: '2026-06-17T15:48:11-07:00',
                    id: '490977',
                    message: 'hello',
                    time: 24.6,
                    user: { avatarUrl: 'https://example.com/a.png', name: 'Alex Park' },
                },
            ]);
        });

        test('Should drop resolved comments to mirror the sidebar filtered view', () => {
            const response = {
                entries: [
                    {
                        activity_type: 'enhanced_comment',
                        source: {
                            enhanced_comment: {
                                created_by: { name: 'Alex Park' },
                                id: '1',
                                message: '#[timestamp:5000] body',
                                status: 'resolved',
                            },
                        },
                    },
                ],
            };

            expect(TimestampedCommentsAPI.parseResponse(response)).toEqual([]);
        });

        test('Should accept comment entries without a versionId in the prefix', () => {
            const response = {
                entries: [
                    {
                        activity_type: 'comment',
                        source: {
                            comment: {
                                created_at: '2026-06-17T15:48:11-07:00',
                                created_by: { name: 'Alex Park' },
                                id: '1',
                                message: '#[timestamp:5000] body',
                            },
                        },
                    },
                ],
            };

            expect(TimestampedCommentsAPI.parseResponse(response)).toEqual([
                {
                    createdAt: '2026-06-17T15:48:11-07:00',
                    id: '1',
                    message: 'body',
                    time: 5,
                    user: { avatarUrl: undefined, name: 'Alex Park' },
                },
            ]);
        });

        test('Should drop entries that are not comments or that lack a timestamp prefix', () => {
            const response = {
                entries: [
                    { activity_type: 'task', source: {} },
                    {
                        activity_type: 'enhanced_comment',
                        source: { enhanced_comment: { id: '2', message: 'no prefix here' } },
                    },
                    {
                        activity_type: 'enhanced_comment',
                        source: null,
                    },
                ],
            };

            expect(TimestampedCommentsAPI.parseResponse(response)).toEqual([]);
        });
    });

    describe('getTimestampedComments()', () => {
        test('Should call api.get with the file_activities URL + auth headers and return the parsed list', () => {
            const apiResponse = {
                entries: [
                    {
                        activity_type: 'enhanced_comment',
                        source: {
                            enhanced_comment: {
                                created_at: 'now',
                                created_by: { name: 'Alex Park' },
                                id: '1',
                                message: '#[timestamp:1000] x',
                            },
                        },
                    },
                ],
            };
            stubs.get.mockResolvedValueOnce(apiResponse);

            return stubs.timestampedCommentsAPI
                .getTimestampedComments('123', { apiHost: 'https://api.box.com', token: 'tok' })
                .then(result => {
                    expect(stubs.get).toBeCalledWith(
                        expect.stringContaining('/2.0/file_activities?file_id=123'),
                        expect.objectContaining({ headers: expect.any(Object) }),
                    );
                    expect(result).toEqual([
                        {
                            createdAt: 'now',
                            id: '1',
                            message: 'x',
                            time: 1,
                            user: { avatarUrl: undefined, name: 'Alex Park' },
                        },
                    ]);
                });
        });

        test('Should reject when api.get rejects', () => {
            const apiError = new Error('boom');
            stubs.get.mockRejectedValueOnce(apiError);

            return stubs.timestampedCommentsAPI
                .getTimestampedComments('123', { apiHost: 'https://api.box.com', token: 'tok' })
                .catch(err => {
                    expect(err).toBe(apiError);
                });
        });
    });
});
