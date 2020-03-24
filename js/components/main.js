import { MdcComponent, defineComponent } from './mdc-component.js'

class MainComponent extends MdcComponent {
    static template = html`
    <div>
        <div class="your-id-container">
            <mdc-textbox id="txtId" label="Your Id" ></mdc-textbox>
            <mdc-button id="btnGetId">Get New Id</mdc-button>
        </div>
        <div class="peer-id-container">
            <mdc-textbox id="peerId" label="Peer Id" ></mdc-textbox>
            <mdc-button id="btnConnectPeer">Connect peer</mdc-button>
        </div>
        <div class="peer-list-container">
            <peer-list id="peerList"></peer-list>
        </div>
        <log-component id="logComponent"/>
    </div>
    `
    static style = html`
        <style>
            .your-id-container {
                display: flex;
                align-items: center;
            }
        </style>
    `

    constructor() {
        super();
        this.peers = new Map();
    }

    afterRender() {
        this.loadElements();
        this.connectServer();
        this.elements.btnGetId.addEventListener("click", () => this.connectServer());
        this.elements.btnConnectPeer.addEventListener("click", () => this.connectPeer())
    }

    logInfo(msg) {
        this.elements.logComponent.logInfo(msg)
    }

    logError(msg) {
        this.elements.logComponent.logError(msg)
    }

    disconnectServer() {
        if (this.peer && !this.peer.disconnected) {
            this.peer.disconnect();
        }
    }

    onDisconnectServer() {

    }

    onConnectedToPeerServer(id) {
        this.logInfo(`opened: your id ${id}`)
        this.elements.txtId.setValue(id);
    }

    onIncomingPeerConnection(conn) {
        this.addPeerConnection(conn);
    }

    addPeerConnection(conn) {
        let connectionsMap = this.peers.get(conn.peer);
        if (!connectionsMap) {
            connectionsMap = new Map();
            this.peers.set(conn.peer, connectionsMap);
        }
        
        connectionsMap.set(conn.label, conn);
        this.elements.peerList.addPeer(conn);

        conn.on('data', (data) => {
            this.logInfo(data);
        });
        conn.on('open', () => {
            alert('someone connect!')
            conn.send('hello!');
        });
    }
 
    connectServer() {
        this.disconnectServer();
        this.peer = new Peer(/*{key: 'lwjd5qra8257b9'}*/);
        this.peer.on('open', id => this.onConnectedToPeerServer(id));
        this.peer.on('error', ex => { console.error(ex); this.logError(ex.stack) });
        this.peer.on('disconnected', () => this.onDisconnectServer());
        this.peer.on('connection', (conn) => this.onIncomingPeerConnection(conn));
    }

    connectPeer() {
        let peerId = this.elements.peerId.getValue();
        if (!peerId) {
            return;
        } 

        var conn = peer.connect(peerId);
        this.addPeerConnection(conn, {
            reliable: true,
            metadata: {
                name: 'tba'
            }
        });
    }

}

defineComponent('main-component', MainComponent);