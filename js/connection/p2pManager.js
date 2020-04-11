import { SignalingManager  } from './signalingManager.js';
import { P2pConnection } from './p2pConnection.js'
import { logger } from '../logger.js'

/**
 * Bridges between p2pConnections and the signalingServer to create and accept connections
 * 1) when connecting to another remote peer
 * 2) when receiving new message / offer from signalingServer to start connection
 * 3) todo:to support multiple streams, need to change remoteVideo to array. and localVideo set up once
 */
class P2pManager {
    constructor(signalServerUrl, localVideoElement, remoteVideoElement) {
        this.signalServerUrl = signalServerUrl;
        this.signalingManager = new SignalingManager(signalServerUrl);
        this.signalingManager.onReceivedOffer = (peerId, incomingOffer) => this.onReceivedOffer(peerId, incomingOffer);
        this.localId = null;
        this.connections = new Map();
        this.localVideoElement = localVideoElement;
        this.remoteVideoElement = remoteVideoElement;
    }

    async connectSignalingServer() {
        try {   
            await this.signalingManager.connect();
            this.localId = await this.signalingManager.getLocalId();
        }
        catch (ex) {
            logger.error(ex);
            throw(ex);
        }

        return this.localId;
    }
               
    async connectPeer(remoteId) {
        let p2pConnection = null;
        try {   
            await this.connectSignalingServer();
            p2pConnection = new P2pConnection(this.localId, remoteId, this.signalingManager, this.localVideoElement, this.remoteVideoElement);
            this.connections.set(remoteId, p2pConnection);
            await p2pConnection.connect();
            setTimeout(() => this.onNewConnection(p2pConnection), 0);
        }
        catch (ex) {
            logger.error(ex);
            throw(ex);
        }

        return p2pConnection;
    }

    async onReceivedOffer(remoteId, incomingOffer)  {
        let p2pConnection = null;
        try {   
            await this.connectSignalingServer();
            p2pConnection = new P2pConnection(this.localId, remoteId, this.signalingManager, this.localVideoElement, this.remoteVideoElement);
            this.connections.set(remoteId, p2pConnection);
            await p2pConnection.connectFromOffer(incomingOffer);
            setTimeout(() => this.onNewConnection(p2pConnection), 0);
        }
        catch (ex) {
            logger.error(ex);
            throw(ex);
        }

        return p2pConnection;
    }

    onNewConnection(connection) {
    }
        
}

export {
    P2pManager
}


