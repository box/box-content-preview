// <reference types="Cypress" />
describe('Read-only PDF form fields', () => {
    const token = 'fake-token';
    const fileId = '123';
    const contentHost = 'https://dl.test';

    const createFileInfo = ({ canDownload }) => ({
        type: 'file',
        id: fileId,
        name: 'form.pdf',
        extension: 'pdf',
        size: 10000,
        sha1: 'abc123',
        file_version: { type: 'file_version', id: '456', sha1: 'abc123' },
        permissions: {
            can_download: canDownload,
            can_preview: true,
            can_annotate: false,
            can_create_annotations: false,
            can_view_annotations: false,
        },
        shared_link: null,
        watermark_info: { is_watermarked: false },
        authenticated_download_url: `${contentHost}/download`,
        is_download_available: true,
        representations: {
            entries: [
                {
                    representation: 'pdf',
                    properties: {},
                    info: { url: `${contentHost}/pdf/info` },
                    status: { state: 'success' },
                    content: { url_template: `${contentHost}/pdf/content/{+asset_path}` },
                },
            ],
        },
    });

    const showForm = ({ pdf, canDownload = true, features }) => {
        cy.intercept('GET', `**/2.0/files/${fileId}*`, { body: createFileInfo({ canDownload }) });
        cy.intercept('GET', `${contentHost}/**`, { body: { status: { state: 'success' } } });
        cy.intercept('GET', `${contentHost}/pdf/content/**`, {
            fixture: `${pdf},null`,
            headers: { 'content-type': 'application/pdf' },
        });

        cy.showPreview(token, fileId, { features, showDownload: canDownload });
        cy.getPreviewPage(1).find('.canvasWrapper canvas');
    };

    const getField = name => cy.get(`.annotationLayer [name="${name}"]`);

    const FORM_FIELDS_ON = { enableReadOnlyFormFields: true, useNpmPdfjs: true, enablePdfjsFork: true };

    beforeEach(() => {
        cy.visit('/');
    });

    it('Should render form fields as controls that cannot be edited', () => {
        showForm({ pdf: 'form-fields.pdf', features: FORM_FIELDS_ON });

        ['multiline', 'multilineNoScroll', 'singleLine', 'comb'].forEach(name => {
            getField(name).should('have.prop', 'readOnly', true).and('have.prop', 'disabled', false);
        });
        ['checkbox', 'dropdown', 'listBox', 'multiSelect'].forEach(name => {
            getField(name).should('have.prop', 'disabled', true);
        });
        getField('radio').each($radio => expect($radio).to.have.prop('disabled', true));
    });

    it('Should let an overflowing text field scroll to its last line', () => {
        showForm({ pdf: 'form-overflow.pdf', features: FORM_FIELDS_ON });

        getField('FieldA')
            .should('contain.value', 'END OF TEXT')
            .then($field => {
                const textarea = $field[0];
                expect(textarea.scrollHeight).to.be.above(textarea.clientHeight);

                textarea.scrollTop = textarea.scrollHeight;
                expect(textarea.scrollTop + textarea.clientHeight).to.be.closeTo(textarea.scrollHeight, 1);
            });
    });

    it('Should keep fields flagged DoNotScroll from scrolling', () => {
        showForm({ pdf: 'form-fields.pdf', features: FORM_FIELDS_ON });

        getField('multilineNoScroll').should('have.css', 'overflow-y', 'hidden');
    });

    it('Should scroll the field under the pointer when the wheel lands on a layer above it', () => {
        showForm({ pdf: 'form-fields.pdf', features: FORM_FIELDS_ON });

        const wheelOver = name =>
            getField(name).then($field => {
                const fieldRect = $field[0].getBoundingClientRect();
                cy.getPreviewPage(1).then($page => {
                    const pageRect = $page[0].getBoundingClientRect();
                    cy.wrap($page).trigger(
                        'wheel',
                        fieldRect.left - pageRect.left + fieldRect.width / 2,
                        fieldRect.top - pageRect.top + fieldRect.height / 2,
                        { deltaX: 0, deltaY: 60, force: true },
                    );
                });
            });

        wheelOver('multiline');
        getField('multiline').should($field => expect($field[0].scrollTop).to.be.above(0));

        wheelOver('multilineNoScroll');
        getField('multilineNoScroll').should($field => expect($field[0].scrollTop).to.equal(0));
    });

    it('Should leave arrow keys to the caret and change pages with brackets while a field has focus', () => {
        showForm({ pdf: 'form-overflow.pdf', features: FORM_FIELDS_ON });
        cy.getByTestId('bp-PageControlsForm-button').as('currentPage').should('have.text', '1 / 3');

        getField('FieldA').focus().trigger('keydown', { key: 'ArrowRight' });
        cy.get('@currentPage').should('have.text', '1 / 3');

        getField('FieldA').trigger('keydown', { key: ']' });
        cy.get('@currentPage').should('have.text', '2 / 3');
    });

    it('Should block copying field text for users who cannot download', () => {
        showForm({ pdf: 'form-overflow.pdf', canDownload: false, features: FORM_FIELDS_ON });

        getField('FieldA').then($field => {
            ['copy', 'cut', 'dragstart'].forEach(type => {
                const event = new Event(type, { bubbles: true, cancelable: true });
                $field[0].dispatchEvent(event);
                expect(event.defaultPrevented, type).to.be.true;
            });
        });
    });

    it('Should allow copying field text for users who can download', () => {
        showForm({ pdf: 'form-overflow.pdf', features: FORM_FIELDS_ON });

        getField('FieldA').then($field => {
            const event = new Event('copy', { bubbles: true, cancelable: true });
            $field[0].dispatchEvent(event);
            expect(event.defaultPrevented).to.be.false;
        });
    });

    const PAINTED_FIELD_FEATURES = {
        'enableReadOnlyFormFields is off': { useNpmPdfjs: true, enablePdfjsFork: true },
        'pdf.js is the vendored build': { enableReadOnlyFormFields: true },
        'the pdf.js fork is off': { enableReadOnlyFormFields: true, useNpmPdfjs: true },
    };

    Object.entries(PAINTED_FIELD_FEATURES).forEach(([reason, features]) => {
        it(`Should paint fields onto the page without controls when ${reason}`, () => {
            showForm({ pdf: 'form-fields.pdf', features });

            cy.get('.annotationLayer').find('input, select, textarea').should('not.exist');
        });
    });
});
