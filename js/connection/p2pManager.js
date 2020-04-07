import { SignalingManager  } from './signalingManager.js';
import { P2pConnection } from './p2pConnection.js'

const signalServerUrl = "ws://localhost:8080"

/**
 * Bridges between p2pConnections and the signalingServer to create and accept connections
 * 1) when connecting to another remote peer
 * 2) when receiving new message / offer from signalingServer to start connection
 */
class P2pManager {
    constructor(signalServerUrl) {
        this.signalServerUrl = signalServerUrl;
        this.signalingManager = new SignalingManager(signalServerUrl);
        this.signalingManager.onReceivedOffer = this.onReceivedOffer 
    }
               
    connectPeer(remoteId) {
        let p2pConnection = null;
        try {   
            await this.signalingManager.connect();
            let localId = await this.signalingManager.getLocalId();
            p2pConnection = new P2pConnection(localId, remoteId);
            await p2pConnection.connect();
            return p2pConnection
        }
        catch (ex) {
            console.error(ex);
        }

        return p2pConnection;
    }

    onReceivedOffer(remoteId, incomingOffer)  {
        let p2pConnection = null;
        try {   
            await this.signalingManager.connect();
            let localId = await this.signalingManager.getLocalId(); // make sure that have id.
            p2pConnection = new P2pConnection(localId, remoteId);
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


