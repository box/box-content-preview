import autobind from 'autobind-decorator';
import EventEmitter from 'events';
import './toggle.scss';

const CLASS_TOGGLE = 'box-preview-toggle';
const CLASS_TOGGLE_BTN = 'box-preview-toggle-btn';

const TEMPLATE = `
    <div class="box-ui-toggle-container">
        <input type="checkbox" class="${CLASS_TOGGLE}" />
        <label class="${CLASS_TOGGLE_BTN}"></label>
    </div>`;

@autobind
class Toggle extends EventEmitter {
    constructor(container, on) {
        super();
        this.container = container;
        this.on = !!on;
        this.container.innerHTML = TEMPLATE;
        this.input = this.container.querySelector(`.${CLASS_TOGGLE}`);
        this.updateCheckbox();
    }

    updateCheckbox() {
        this.input.checked = this.on;
        this.emit(this.on ? 'on' : 'off');
        console.error(this.on ? 'on' : 'off');
    }

    clickHandler() {
        this.on = !this.input.checked;
        this.updateCheckbox();
    }

    toggle() {
        this.on = !this.on;
        this.updateCheckbox();
    }
}

global.Toggle = Toggle;
export default Toggle;
