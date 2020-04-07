import { MdcComponent, defineComponent } from './mdc-component.js'

let template = html`
<ul id="log"></ul>
`

let style =
`#log {
    width:100%;
    height:100%;
}
`

class LogComponent extends MdcComponent {
    constructor() {
        super();
    }

    afterRender() {
        
    }

    log(msg, className = "info") {
        let li = document.createElement('li');
        li.innerText = msg;
        li.className = className;
        this.elements.log.appendChild(li);
    }

    logInfo(msg) {
       this.log(msg, 'info');
    }

    logError(msg) {
        this.log(msg, 'error');
    }
}

defineComponent('log-component', LogComponent, { template, style });