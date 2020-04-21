import { SignalingManager  } from './signalingManager.js';
import { P2pConnection } from './p2pConnection.js';
import { logger } from '../logger.js';
import { cameraManager } from '../cameraManager.js';

/**
 * Bridges between p2pConnections and the signalingServer to create and accept connections
 * 1) when connecting to another remote peer
 * 2) when receiving new message / offer from signalingServer to start connection
 * 3) todo:to support multiple streams, need to change remoteVideo to array. and localVideo set up once
 */
class P2pManager {
    constructor(signalServerUrl, localVideoElement) {
        this.signalServerUrl = signalServerUrl;
        this.signalingManager = new SignalingManager(signalServerUrl);
        this.signalingManager.onReceivedOffer = (peerId, incomingOffer) => this.onReceivedOffer(peerId, incomingOffer);
        this.signalingManager.onDisconnect = () => this.onDisconnectSignalingServer();
        this.localId = null;
        /**@type {Map<String, P2pConnection>}  */
        this.connections = new Map();
        this.localStream = null;
        this.localVideoElement = localVideoElement;
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
            p2pConnection = this.createP2pConnection(remoteId);
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
        /**@type P2pConnection */
        let p2pConnection = null;
        try {   
            await this.connectSignalingServer();
            let existingConnection = this.connections.get(remoteId);
            if (existingConnection) {
                p2pConnection = existingConnection;
                p2pConnection.negotiateBack(incomingOffer);
            }
            else {
                p2pConnection = this.createP2pConnection(remoteId);
                p2pConnection.onRemoteTrack = (track, stream) => {
                    this.connections.forEach(con => { 
                            if (con.isHost && con != p2pConnection) {
                                logger.info(`transmitting the new peer ${con.remote.id} to other existing connections`)
                                con.setOtherRemoteTrack(p2pConnection.remote.id, track, stream);
                            }
                      });
                }
                await p2pConnection.connectFromOffer(incomingOffer);
                this.localStream && p2pConnection.setMediaStream(this.localStream);
                if (this.connections.size > 1) {
                    this.connections.forEach(con => { 
                        if (con.isHost && p2pConnection !== con ) {
                            logger.info(`transmitting existing connections tacks to the new peer ${con.remote.id}`)
                            // transmit all existing other peers tracks
                            if (con.remote.rtpTracks.video) {
                                p2pConnection.setOtherRemoteTrack(con.remote.id, con.remote.rtpTracks.video.track, con.remote.stream)
                            }
                            
                            if (con.remote.rtpTracks.audio) {
                                p2pConnection.setOtherRemoteTrack(con.remote.id, con.remote.rtpTracks.audio.track, con.remote.stream)
                            }
                        }
                    })  
                }
                setTimeout(() => this.onNewConnection(p2pConnection), 0);
            }
        }
        catch (ex) {
            logger.error(ex);
            throw(ex);
        }

        return p2pConnection;
    }

    createP2pConnection(remoteId) {
        let p2pConnection = new P2pConnection(this.localId, remoteId, this.signalingManager, this.remoteVideoElement);
        this.connections.set(remoteId, p2pConnection);
        p2pConnection.on('disconnected', () => {
            logger.info(`deleting connection ${remoteId}`);
            this.connections.delete(remoteId);
        });
            
        return p2pConnection;
    }

    hasPeersOrWsConnection() {
        let hasConnection = false;
        if (!this.signalingManager.ws.readyState === WebSocket.OPEN) {
            
            for (let connection of this.connections) {
                if (!connection.isDisconnected()) {
                    hasConnection = true;
                    break;
                }
            }
        } else {
            hasConnection = true;
        }

        return hasConnection;
    }

    onDisconnectSignalingServer() {
    }

    /**@param  connection {P2pConnection} */
    onNewConnection(connection) {
    }

    setLocalStream(stream) {
        try {
            this.localStream = stream;
            this.connections.forEach(async c =>  {
                await c.deferred;
                c.setMediaStream(stream);
            })     
        }
        catch (ex) {
            logger.error(ex);
        }
    }
        
}

export {
    P2pManager
}


