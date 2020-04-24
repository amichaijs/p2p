import { MdcComponent, defineComponent } from './mdc-component.js'

let template =  html`
 <button id="btn" class="call-action-button material-icons"></button>
`
class IconButton extends MdcComponent {
    constructor() {
        super();
    }

    getIcon() {
        this.elements.btn.innerText;
    }

    setIcon(icon) {
        this.elements.btn.innerText = icon;
    }    
}

let style =html`
<style>
    #btn {
        margin-right: 15px;
        color: black;
        color: white;
        font-size: 42px;
        height: 1em;
        width: 1em;
        display: inline-block;
        text-shadow: 1px 0px 0px black, -1px 0px 0px black, 0px 1px 0px black, 0px -1px 0px black;
        outline: none;
        user-select: none;
        background: none;
        border: none;
    }
</style>
`

defineComponent('icon-button', IconButton, { template, style  });

