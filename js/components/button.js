import { MdcComponent, defineComponent } from './mdc-component.js'

class MdcButton extends MdcComponent {
    static template = html`
    <button id="button" class="btn waves-effect waves-light">
        <span ud="title" class="mdc-button__label"><slot></slot></span>
    </button>
    `

    constructor() {
        super();
    }

    afterRender() {
        //new mdc.ripple.MDCRipple(this.button);
    }
}

defineComponent('mdc-button', MdcButton);