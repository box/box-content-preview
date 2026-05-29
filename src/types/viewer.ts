export type BoxToken = string | (() => string | Promise<string>);

export type RepresentationStatus = 'none' | 'pending' | 'viewable' | 'success' | 'error';

export interface BoxRepresentation {
    representation: string;
    status: { state: RepresentationStatus };
    content: { url_template: string };
    info?: { url: string };
    properties?: Record<string, string>;
}

export interface BoxFile {
    id: string;
    type: 'file';
    name?: string;
    size?: number;
    extension?: string;
    representations?: { entries: BoxRepresentation[] };
}

export type ViewerStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ViewerError {
    code: string;
    message: string;
    cause?: unknown;
}

export interface ViewerLifecycleHandlers {
    onLoad?: () => void;
    onError?: (error: ViewerError) => void;
}
