import { SignalingManager } from './signalingManager.js';
import { P2pConnection } from './p2pConnection.js';
import { logger } from '../logger.js';
import { cameraManager } from '../cameraManager.js';
import { EventManager } from '../helpers.js';

/**
 * Bridges between p2pConnections and the signalingServer to create and accept connections
 * 1) when connecting to another remote peer
 * 2) when receiving new message / offer from signalingServer to start connection
 * 3) todo:to support multiple streams, need to change remoteVideo to array. and localVideo set up once
 */
class P2pManager {
    constructor(isHost, signalServerUrl) {
        this.signalServerUrl = signalServerUrl;
        this.signalingManager = new SignalingManager(signalServerUrl);
        this.signalingManager.onReceivedOffer = (peerId, incomingOffer) => this.onReceivedOffer(peerId, incomingOffer);
        this.signalingManager.onDisconnect = () => this.onDisconnectSignalingServer();
        this.localId = null;
        /**@type {Map<String, P2pConnection>}  */
        this.connections = new Map();
        this.localStream = null;
        this.isHost = isHost;
        this.events = new EventManager('connectionCreated');
    }

    on(eventName, callback) {
        return this.events.on(eventName, callback);
    }

    off(eventName, callback) {
        return this.events.off(eventName, callback);
    }

    async connectSignalingServer() {
        try {
            await this.signalingManager.connect();
            this.localId = await this.signalingManager.getLocalId();
        }
        catch (ex) {
            logger.error(ex);
            throw (ex);
        }

        return this.localId;
    }

    async connectPeer(remoteId) {
        let p2pConnection = null;
        try {
            await this.connectSignalingServer();
            p2pConnection = this.createP2pConnection(remoteId);
            await p2pConnection.connect();
        }
        catch (ex) {
            logger.error(ex);
            if (p2pConnection) {
                p2pConnection.close();
            }
            throw (ex);
        }

        return p2pConnection;
    }

    async onReceivedOffer(remoteId, incomingOffer) {
        /**@type P2pConnection */
        let p2pConnection = null;
        try {
            logger.info(`received offer from ${remoteId}`);

            p2pConnection = this.connections.get(remoteId);
            p2pConnection = this.checkConnection(p2pConnection);
            
            await this.connectSignalingServer();
            
            if (p2pConnection) {
                logger.info(`negotiateBack state:${p2pConnection.rtcPeerConnection.connectionState}`);
                p2pConnection.negotiateBack(incomingOffer);
            }
            else {
                p2pConnection = this.createP2pConnection(remoteId);

                // if (this.isHost) {
                //     p2pConnection.on('remoteTrack',({ track, stream }) => {
                //         this.forwardNewRemoteTracksToOtherPeers(p2pConnection, track, stream);
                //     })
                // }

                let streams = this.getExistingStreams(p2pConnection);

                await p2pConnection.connectFromOffer(incomingOffer, streams);

                // if (!this.localStream) {
                //     p2pConnection.setMediaStream(this.localStream);
                // }

                if (this.isHost) {
                    setTimeout(() => {
                        this.requestOtherPeersToConnectPeer(remoteId);
                    }, 0);
                }

                //setTimeout(() => this.onNewConnection(p2pConnection), 0);
            }
        }
        catch (ex) {
            logger.error(ex);
            throw (ex);
        }

        return p2pConnection;
    }

    requestOtherPeersToConnectPeer(connectToPeerId) {
        logger.info(`request other peers to connect to peer ${connectToPeerId}`);
        Array.from(this.connections.values())
        .filter(con => con.remote.id != connectToPeerId)
        .forEach(con => {
            con.requestRemoteConnectOtherPeer(connectToPeerId);
        })
    }

    getExistingConnections() {
        let cons = Array.from(this.connections.values()).filter(con => con.isConnected());
        return cons;
    }

    getExistingStreams(exceptP2pConnection = null) {
        let streams = this.isHost ? this.getExistingConnections().filter(con => con != exceptP2pConnection).map(con => con.remote.stream) : null;
        return streams;
    }

    checkConnection(p2pConnection) {
        if (p2pConnection && p2pConnection.isDoomed()) {
            let remoteId = p2pConnection.remote.id;
            logger.info(`connection ${remoteId} already exists but state ${p2pConnection.rtcPeerConnection.connectionState}, deleting it to re-create`)
            this.connections.delete(remoteId);
            p2pConnection =  null;
        }

        return p2pConnection;
    }

    // forwardNewRemoteTracksToOtherPeers(p2pConnection, track, stream) {
    //     if (this.connections.size > 1) {
    //         logger.info('forwardNewRemoteTracksToOtherPeers');
    //         this.connections.forEach(con => {
    //             if (con != p2pConnection) {
    //                 logger.info(`transmitting the new peer ${con.remote.id} to other existing connections`)
    //                 if (con.rtcPeerConnection.connectionState === "connected") {
    //                     con.setOtherRemoteTrack(p2pConnection.remote.id, track, stream);

    //                 }
    //             }
    //         });
    //     }
    // }

    createP2pConnection(remoteId) {
        let p2pConnection = new P2pConnection(this.localId, remoteId, this.isHost, this.signalingManager);
        this.connections.set(remoteId, p2pConnection);
        p2pConnection.on('connectionStateChange',  ({ connectionState }) => {
            switch (connectionState) {
                case 'closed':
                    this.removeConnection(remoteId);
                    break;
                case 'failed':
                    let con = this.connections.get(remoteId);
                    this.removeConnection(remoteId);
                    
                    if (con && con.isOfferer) {
                        setTimeout(() => {
                            logger.info(`attempt reconnect failed connection of peer ${remoteId}`);
                            this.connectPeer(remoteId);
                        }, 2000)
                    }
                    break;
            }
        });
        
        p2pConnection.on('request-connect-to-peer', ({ peerId }) => {
            logger.info(`requested by remote to connect to peerId ${peerId}`);
            if (!this.connections.has(peerId)) {
                this.connectPeer(peerId);
            }
            else {
                logger.warn(`already have connection for peer ${peerId}`)
            }
        })

        this.events.dispatchEvent('connectionCreated', p2pConnection);

        return p2pConnection;
    }

    removeConnection(remoteId) {
        logger.info(`deleting connection ${remoteId}`);
        return this.connections.delete(remoteId);
    }

    // removeForwardedTracksFromDeadConnection(p2pConnection) {
    //     // each connection that has forwaded tracks create its own senders that wraps the same track object.
    //     // remotes have removetrack event on their side.

    //     //TODO remote.stream
    //     if (p2pConnection.remote.stream) {
    //         let tracks = p2pConnection.remote.stream.getTracks();
    //         logger.info(`remove existing stream from conference ${p2pConnection.remote.stream.id}`)

    //         this.connections.forEach(con => {
    //             con.stopForwardingTracks(p2pConnection.remote.stream, tracks);
    //         })

    //         for (let track of tracks) {
    //             p2pConnection.remote.stream.removeTrack(track);
    //         }

    //         // for host
    //         p2pConnection.remote.stream.dispatchEvent(new Event('removetrack'));

    //     }
    // }

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

    setLocalStream(stream) {
        try {
            this.localStream = stream;
            this.connections.forEach(async c => {
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


