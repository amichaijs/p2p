import { SignalingManager  } from './signalingManager.js';
import { P2pConnection } from './p2pConnection.js'

/**
 * Bridges between p2pConnections and the signalingServer to create and accept connections
 * 1) when connecting to another remote peer
 * 2) when receiving new message / offer from signalingServer to start connection
 */
class P2pManager {
    constructor(signalServerUrl, logInfo, logError) {
        this.signalServerUrl = signalServerUrl;
        this.signalingManager = new SignalingManager(signalServerUrl);
        this.signalingManager.onReceivedOffer = (peerId, incomingOffer) => this.onReceivedOffer(peerId, incomingOffer);
        this.localId = null;
        this.logInfo = logInfo;
        this.logError = logError;
        this.connections = new Map();
    }

    async connectSignalingServer() {
        try {   
            await this.signalingManager.connect();
            this.localId = await this.signalingManager.getLocalId();
        }
        catch (ex) {
            console.error(ex);
        }

        return this.localId;
    }
               
    async connectPeer(remoteId) {
        let p2pConnection = null;
        try {   
            await this.connectSignalingServer();
            p2pConnection = new P2pConnection(this.localId, remoteId, this.signalingManager, this.logInfo, this.logError);
            this.connections.set(remoteId, p2pConnection);
            await p2pConnection.connect();
            return p2pConnection
        }
        catch (ex) {
            console.error(ex);
        }

        return p2pConnection;
    }

    async onReceivedOffer(remoteId, incomingOffer)  {
        let p2pConnection = null;
        try {   
            await this.connectSignalingServer();
            p2pConnection = new P2pConnection(this.localId, remoteId, this.signalingManager, this.logInfo, this.logError);
            this.connections.set(remoteId, p2pConnection);
            await p2pConnection.connectFromOffer(incomingOffer)
            return p2pConnection;
        }
        catch (ex) {
            console.error(ex);
        }

        return p2pConnection;
    }
        
}

//TODO
// channels.

export {
    P2pManager
}


