export interface LumAppsContext {
    baseUrl: string;
    extensionId: string;
    haussmannCell: string;
    lang: string;
    organizationId: string;
    token: string;
}

export interface PassThroughData {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    url: string;
    body?: object;
    params?: object;
}
