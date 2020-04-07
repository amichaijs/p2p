import { MdcComponent, defineComponent } from './mdc-component.js'
import { requestId } from '../helpers.js'


let props = {
    label: null,
    value: null,
    size: null
}

let template = html`
<div class="input-field">
    <input id="input" type="text" :="value" placeholder=" ">
    <label id="title" for="input" :="label"></label>
</div>`

let style =
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


class MdcTextBox extends MdcComponent {
// placeholder= " " important for  :not(:placeholder-shown)
    constructor() {
        super();
    }

    get size() {
        return this.elements.input.size;
    }

    set size(value) {
        this.elements.input.size = value;
    }

    afterRender() {
    }

    /*update(name, newValue, oldValue) {
        switch (name) {
            case 'label':
                this.setLabel(newValue);
                break;
            case 'value':
                this.setValue(newValue);
            case 'size':
                if (newValue) {
                    this.elements.input.size = newValue;
                }
                break;
        }
    }*/

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




defineComponent('mdc-textbox', MdcTextBox, { template, style, props });