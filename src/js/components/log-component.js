import { MdcComponent, defineComponent } from './mdc-component.js'

class LogComponent extends MdcComponent {
    static template = html`
    <ul id="log"></ul>
    `

    static style =
    `#log {
        width:100%;
        height:100%;
    }
    `

    constructor() {
        super();
    }

    afterRender() {
        this.elements.log = this.shadowRoot.querySelector('#log');
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

defineComponent('log-component', LogComponent);