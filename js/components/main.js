import { MdcComponent, defineComponent } from './mdc-component.js'
import { generateRandomId } from '../helpers.js'
import { P2pManager } from '../connection/p2pManager.js';

/*
    - create random "UserId" for each machine. it should persists until browser close.
    - the peer ids from STUN server are temporary and may change. thus each peer need to update on peerId change, using the UserId in metadata

*/

const signalServerUrl = "wss://js-webrtc-server.herokuapp.com"

const ConnectionType = {
    Main: 0,
    Audio: 1,
    Video:2,

}

let template = html`
<div>
    <div class="flex-row-center">
        <mdc-textbox id="txtId" label="Your Id"  size="16" ></mdc-textbox>
        <mdc-button id="btnGetId">Get New Id</mdc-button>
    </div>
    <div class="flex-row-center">
        <mdc-textbox id="peerId" label="Peer Id" size="16" ></mdc-textbox>
        <mdc-button id="btnConnectPeer">Connect peer</mdc-button>
    </div>
    <div class="peer-list-container">
        <peer-list id="peerList"></peer-list>
    </div>
    <log-component id="logComponent"/>
</div>`;

let style = html`
<style>
    .flex-row-center {
        display: flex;
        align-items: center;
        min-width:50%;
    }

    .flex-row-center * {
        margin-right: 10px;
    }
</style>`;

class MainComponent extends MdcComponent {
    constructor() {
        super();
        this.peers = new Map();
        this.p2pManager = new P2pManager(signalServerUrl, message => this.logInfo(message), message => this.logError(message));
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

    clearPeer() {
        if (this.peer && this.peer) {
            this.peer.recreate = false;
            this.peer.disconnect();
        }
    }

    onDisconnectServer() {
        if (this.peer && !this.peer.destroyed) {
            this.peer.reconnect();
        }
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

        switch (conn.metadata.type) {
            case ConnectionType.Main:
                conn.on('data', ({ message }) => {
                    this.logInfo(message);
                });
                conn.on('open', () => {
                    alert('someone connect!')
                    conn.send({ message: 'hello!'});
                });
                break;
            default:
                this.logError('oh no');
        }
    }

    async connectServer() {
        let localId = await this.p2pManager.connectSignalingServer();
        this.localId = localId;
        this.logInfo(`opened: your id ${localId}`)
        this.elements.txtId.setValue(this.localId);
    }

    async connectPeer() {
        let peerId = this.elements.peerId.getValue();
        if (!peerId) {
            return;
        } 

        let res = await this.p2pManager.connectPeer(peerId);
    }
 
    // connectServer() {
    //     this.clearPeer();
    //     let peer = new Peer(generateRandomId());// /*{key: 'lwjd5qra8257b9'}*/);
    //     peer.recreate = true;
    //     peer.on('open', id => this.onConnectedToPeerServer(id));
    //     peer.on('error', ex => { 
    //         console.error(ex); 
    //         this.logError(ex.stack); setTimeout(() => {
    //         this.onDisconnectServer();
    //     }, 2000); });
    //     peer.on('disconnected', () => { 
    //         this.logInfo('disconnected!');
    //         this.onDisconnectServer() } );
    //     peer.on('connection', (conn) => this.onIncomingPeerConnection(conn));
    //     peer.on('destroy', () =>  { 
    //         this.logError('destruction!!');
    //         if (peer.recreate) {
    //             setTimeout(() => {
    //                 this.connectServer(); 
    //             },5000); 
    //         } 
    //     });

    //     this.peer = peer;
    // }

    // connectPeer() {
    //     let peerId = this.elements.peerId.getValue();
    //     if (!peerId) {
    //         return;
    //     } 

    //     var conn = this.peer.connect(peerId);
    //     this.addPeerConnection(conn, {
    //         reliable: true,
    //         metadata: {
    //             lol: 'lol',
    //             type: ConnectionType.Main,
    //             serialization: 'json'
    //         },
    //     });
    // }

}

defineComponent('main-component', MainComponent, { template, style });