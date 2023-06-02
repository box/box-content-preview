import { getFeatureConfig, isFeatureEnabled } from '../featureChecking';

const features = {
    shouldUseCar: {
        enabled: true,
    },
    shouldUsePlane: {
        enabled: false,
    },
};

describe('featureChecking', () => {
    describe('isFeatureEnabled', () => {
        test('returns truthy when object is enabled and falsy when object is disabled', () => {
            expect(isFeatureEnabled(features, 'shouldUseCar.enabled')).toBe(true);
            expect(isFeatureEnabled(features, 'shouldUsePlane.enabled')).toBe(false);
        });
        test('defaults to false if object does not exist', () => {
            expect(isFeatureEnabled(features, 'unknownKey')).toBe(false);
        });
    });

    describe('getFeatureConfig', () => {
        test('returns feature object if key exists', () => {
            expect(getFeatureConfig(features, 'shouldUseCar')).toEqual({ enabled: true });
            expect(getFeatureConfig(features, 'shouldUsePlane')).toEqual({ enabled: false });
        });

        test('defaults to empty object', () => {
            expect(getFeatureConfig({}, 'unknownKey')).toEqual({});
        });
    });
});
