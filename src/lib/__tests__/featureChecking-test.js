import { getFeatureConfig, isFeatureEnabled } from '../featureChecking';

const Box = {
    features: {
        shouldUseBatman: {
            enabled: true,
        },
        shouldUseSuperman: {
            enabled: false,
        },
    },
};

describe('isFeatureEnabled', () => {
    test('returns truthy when object is enabled and falsy when object is disabled', () => {
        expect(isFeatureEnabled(Box.features, 'shouldUseBatman.enabled')).toBe(true);
        expect(isFeatureEnabled(Box.features, 'shouldUseSuperman.enabled')).toBe(false);
    });
    test('defaults to false if object does not exist', () => {
        expect(isFeatureEnabled(Box.features, 'unknownKey')).toBe(false);
    });
});

describe('getFeatureConfig', () => {
    test('returns feature object if key exists', () => {
        expect(getFeatureConfig(Box.features, 'shouldUseBatman')).toEqual({ enabled: true });
        expect(getFeatureConfig(Box.features, 'shouldUseSuperman')).toEqual({ enabled: false });
    });

    test('defaults to empty object', () => {
        const features = {};
        expect(getFeatureConfig(features, 'unknownKey')).toEqual({});
    });
});
