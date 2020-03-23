import { MdcComponent, defineComponent } from './mdc-component.js'

class MdcButton extends MdcComponent {
    static template = html`
    <button class="mdc-button">
        <div class="mdc-button__ripple"></div>
        <span class="mdc-button__label"><slot></slot></span>
    </button>
    `

    constructor() {
        super();
    }

    afterRender() {
        this.button = this.shadowRoot.querySelector('button');
        this.titleElement = this.shadowRoot.querySelector('span');
        new mdc.ripple.MDCRipple(this.button);
    }
}

defineComponent('mdc-button', MdcButton);