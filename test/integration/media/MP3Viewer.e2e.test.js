import { runBaseMediaSettingsTests, runPlayNextSettingsTests } from '../../support/mediaSettingsTests';

describe('MP3 Viewer', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    const fileIdMP3 = Cypress.env('FILE_ID_MP3');
    const audioV2Options = {
        viewers: { MP3: { useReactControls: true } },
        features: {
            audioPlayerV2: {
                enabled: true,
            },
        },
    };

    const showPreview = (options = {}) => {
        cy.visit('/');
        cy.getByTestId('token').clear();
        cy.getByTestId('fileid').clear();
        cy.showPreview(token, fileIdMP3, options);
    };

    // Do not clear localStorage here — Autoplay/Play next persistence reloads through this helper.
    const loadAudioV2 = () => {
        showPreview(audioV2Options);
        cy.getByTestId('media-controls-wrapper-v2', { timeout: 15000 }).should('be.visible');
    };

    const showAudioV2 = () => {
        cy.clearLocalStorage();
        loadAudioV2();
    };

    const startV2Playback = () => {
        cy.getByTestId('bp-MP3ControlsV2-play-overlay').click();
        cy.getByTestId('bp-MP3ControlsV2-play-overlay').should('not.exist');
        cy.getByTestId('bp-MP3ControlsV2-bar').should('be.visible');
    };

    const openV2Settings = () => {
        startV2Playback();
        cy.getByTitle('Settings').click();
        cy.getByTestId('bp-settings-flyout').should('be.visible');
    };

    const chooseVisibleSetting = label => {
        cy.get('[role="menuitemradio"]')
            .filter(':visible')
            .contains(label)
            .click();
    };

    describe('Media Settings Controls', () => {
        describe('Without react controls', () => {
            beforeEach(() => {
                showPreview({
                    viewers: { MP3: { useReactControls: false } },
                });

                cy.showMediaControls();

                // Open the menu
                cy.getByTitle('Settings').click();
            });

            runBaseMediaSettingsTests();
        });

        describe('With react controls', () => {
            beforeEach(() => {
                showPreview({
                    viewers: { MP3: { useReactControls: true } },
                });

                cy.showMediaControls();

                // Open the menu
                cy.getByTitle('Settings').click();
            });

            it('should not show play next', () => {
                cy.getByTestId('bp-media-settings-play-next').should('not.exist');
            });

            runBaseMediaSettingsTests();
        });
    });

    describe('With audio player v2', () => {
        it('Should mount the v2 player and start from the overlay', () => {
            showAudioV2();

            cy.get('.bp-media--v2').should('exist');
            cy.getByTestId('media-controls-wrapper-v2').should('be.visible');
            cy.getByTestId('bp-waveform-view').should('be.visible');
            cy.getByTestId('bp-MP3ControlsV2-play-overlay').should('be.visible');
            cy.getByTestId('bp-waveform-view').should('have.class', 'bp-WaveformView--inert');

            startV2Playback();
            cy.getByTestId('bp-waveform-view').should('not.have.class', 'bp-WaveformView--inert');
        });

        describe('Media Settings Controls', () => {
            beforeEach(() => {
                showAudioV2();
                openV2Settings();
            });

            runPlayNextSettingsTests();
        });

        it('Should start this file on open when Autoplay is enabled', () => {
            showAudioV2();
            startV2Playback();
            cy.getByTitle('Mute').click();
            cy.getByTitle('Settings').click();
            cy.getByTestId('bp-settings-flyout').should('be.visible');

            cy.getByTestId('bp-media-settings-autoplay')
                .contains('Disabled')
                .click();
            chooseVisibleSetting('Enabled');
            cy.getByTestId('bp-media-settings-autoplay').contains('Enabled');

            loadAudioV2();

            cy.getByTestId('bp-MP3ControlsV2-play-overlay').should('not.exist');
            cy.getByTestId('bp-MP3ControlsV2-bar').should('be.visible');
            cy.get('audio').should($audio => {
                expect($audio[0].paused).to.equal(false);
            });
        });

        it('Should emit mediaEndPlayNext when Play next is enabled and playback ends', () => {
            showAudioV2();
            openV2Settings();

            cy.getByTestId('bp-media-settings-play-next')
                .contains('Disabled')
                .click();
            chooseVisibleSetting('Enabled');
            cy.getByTestId('bp-media-settings-play-next').contains('Enabled');
            cy.getByTitle('Settings').click();

            cy.window().then(win => {
                const audio = win.preview.getCurrentViewer().mediaEl;
                const onPlayNext = cy.stub().as('mediaEndPlayNext');
                win.preview.addListener('mediaEndPlayNext', onPlayNext);

                if (!(audio.duration > 0)) {
                    throw new Error('audio duration is not ready');
                }

                audio.currentTime = Math.max(0, audio.duration - 0.15);
                const playResult = audio.play();
                if (playResult && typeof playResult.catch === 'function') {
                    playResult.catch(() => {});
                }
            });
            cy.get('@mediaEndPlayNext').should('have.been.called');
        });

        it('Should keep Play next enabled after reload', () => {
            showAudioV2();
            openV2Settings();

            cy.getByTestId('bp-media-settings-play-next')
                .contains('Disabled')
                .click();
            chooseVisibleSetting('Enabled');
            cy.getByTestId('bp-media-settings-play-next').contains('Enabled');

            loadAudioV2();
            openV2Settings();

            cy.getByTestId('bp-media-settings-play-next').contains('Enabled');
            cy.getByTestId('bp-media-settings-autoplay').contains('Disabled');
        });
    });
});
