import { MdcComponent, defineComponent } from './mdc-component.js'
import { requestId } from '../helpers.js'

class MdcTextBox extends MdcComponent {
    static template = html`
    <div class="input-field">
        <input id="input" type="text" placeholder=" ">
        <label id="title" for="input"></label>
    </div>`

// placeholder= " " important for  :not(:placeholder-shown)
    static style =
    `.input-field label {
        transition: transform linear 200ms;
    }

    .input-field input:not(:placeholder-shown) + label,
    .input-field input:focus + label {
        transform: translateY(-1em) scale(0.75);
    }

    .input-field input:focus + label {
        color:rgba(98,0,238,.87);
    }`

    constructor() {
        super();
    }

    afterRender() {
        this.update('label', this.getAttribute('label'))
        this.update('value', this.getAttribute('value'))
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