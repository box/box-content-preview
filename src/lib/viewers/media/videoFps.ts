const DEFAULT_FPS = 24;

export type ShakaVariantTrack = {
    frameRate?: number;
    active?: boolean;
    [key: string]: unknown;
};

export type ShakaPlayer = {
    getVariantTracks: () => ShakaVariantTrack[];
};

/**
 * Extracts FPS from the active Shaka variant track.
 * Falls back to 24fps (industry default) if unavailable.
 */
export function getVideoFps(player: ShakaPlayer | undefined): number {
    if (!player) return DEFAULT_FPS;

    const tracks = player.getVariantTracks();
    const activeTrack = tracks.find(track => track.active);

    if (activeTrack?.frameRate && activeTrack.frameRate > 0) {
        return activeTrack.frameRate;
    }

    const anyTrackWithFps = tracks.find(t => t.frameRate && t.frameRate > 0);
    if (anyTrackWithFps?.frameRate) {
        return anyTrackWithFps.frameRate;
    }

    return DEFAULT_FPS;
}

export function isFpsAvailable(player: ShakaPlayer | undefined): boolean {
    if (!player) return false;
    const tracks = player.getVariantTracks();
    return tracks.some(t => t.frameRate != null && t.frameRate > 0);
}
