import { MdcComponent, defineComponent } from './mdc-component.js'

class MainComponent extends MdcComponent {
    static template = html`
   <div class="your-id-container">
        <mdc-textbox id="txtId" label="Your Id" ></mdc-textbox>
        <mdc-button id="btnConnect">Get New Id</mdc-button>
        <log-component id="logComponent"/>
    </div>
    `

    constructor() {
        super();
        this.myPeer = null;
    }

    afterRender() {
        this.loadElements();

        this.connectPeerServer();
    }

    logInfo(msg) {
        this.elements.logComponent.logInfo(msg)
    }

    logError(msg) {
        this.elements.logComponent.logError(msg)
    }
 
    connectPeerServer = () => {
        this.peer = new Peer(/*{key: 'lwjd5qra8257b9'}*/);
        this.peer.on('open', id => {
            this.logInfo(`opened: your id ${id}`)
            this.elements.txtId.setValue(id);
        });

        this.peer.on('error', ex => { console.error(ex); this.logError(ex.stack) });

        this.peer.on('connection', (conn) => {
            conn.on('data', (data) => {
                
                console.log(data);
            });
            conn.on('open', () => {
                alert('someone connect!')
                conn.send('hello!');
            });
        });
    }

    loadElements() {  
        this.shadowRoot.querySelectorAll('[id]').forEach(el => {
            this.elements[el.id] = el;
        })
    }

    connect() {
        var conn = peer.connect('dest-peer-id');
    }

}

defineComponent('main-component', MainComponent);