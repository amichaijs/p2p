import { MdcComponent, defineComponent } from './mdc-component.js'
import { requestId } from '../helpers.js'

class MdcTextBox extends MdcComponent {
    static template = html`
    <label class="mdc-text-field">
        <div class="mdc-text-field__ripple"></div>
        <input class="mdc-text-field__input" type="text" placeholder=" ">
        <span class="mdc-floating-label"></span>
        <div class="mdc-line-ripple"></div>
    </label>`

// placeholder= " " important for  :not(:placeholder-shown)
    static style =
    `.mdc-text-field .mdc-floating-label {
        transition: transform linear 200ms;
    }

    .mdc-text-field .mdc-text-field__input:not(:placeholder-shown) + .mdc-floating-label,
    .mdc-text-field .mdc-text-field__input:focus + .mdc-floating-label {
        transform: translateY(-106%) scale(0.75);
    }

    .mdc-text-field .mdc-text-field__input:focus + .mdc-floating-label {
        color:rgba(98,0,238,.87);
    }`

    constructor() {
        super();
    }

    afterRender() {
        this.elements.title = this.shadowRoot.querySelector('.mdc-floating-label');
        this.elements.input = this.shadowRoot.querySelector('.mdc-text-field__input');

        this.update('label', this.getAttribute('label'))
        this.update('value', this.getAttribute('value'))

        this.elements.title.id = requestId('mdc-text-field__input');
        this.elements.input.setAttribute('aria-labelledby', this.elements.title.id); 
        //new mdc.textField.MDCTextField(this.label);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        this.update(name, newValue);
    }

    update(name, value) {
        switch (name) {
            case 'label':
                this.setLabel(value);
                break;
            case 'value':
                this.setValue(value);
                break;
        }
    }

    getLabel() {
        return this.elements.title.innerHTML;
    }

    setLabel(label) {
        this.elements.title.innerHTML = label;
    }

    getValue() {
        return this.elements.input.value;
    }

    setValue(value) {
        this.elements.input.value = value;
    }
}


defineComponent('mdc-textbox', MdcTextBox);