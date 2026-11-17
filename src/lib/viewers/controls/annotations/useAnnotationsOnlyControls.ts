import useMediaQuery from '../hooks/useMediaQuery';

// $bp-breakpoint-medium, where _docBase.scss trims the legacy bar for the same option
export const ANNOTATIONS_ONLY_MEDIA_QUERY = '(max-width: 767px)';

// The host's annotations-only controls only take over the bar on narrow viewports
export default function useAnnotationsOnlyControls(hasAnnotationsOnlyControls = false): boolean {
    const isNarrow = useMediaQuery(ANNOTATIONS_ONLY_MEDIA_QUERY);

    return hasAnnotationsOnlyControls && isNarrow;
}
