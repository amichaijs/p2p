class P2pConnection {
    constructor(localId, remoteId, signalingManager) {
        this.localId = localId;
        this.remoteId = remoteId;
        this.rtcPeerConnection = null;
        this.signalingManager = signalingManager;
    }

    async connect() {
        try {   
            let rtcPeerConnection = new RTCPeerConnection();
            this.rtcPeerConnection = rtcPeerConnection;

            await addIceCandidate(rtcPeerConnection);

            let offer = await this.rtcPeerConnection.createOffer(); // can contain constraints, like to support audio, video etc
            await this.rtcPeerConnection.setLocalDescription(offer);
            let remoteAnswer = await this.signalingManager.sendOffer(remoteId, offer); // remote receive offer, set it as remotedesc, then returns answer
            await this.rtcPeerConnection.setRemoteDescription(remoteAnswer);
        }
        catch (ex) {
            console.error(ex);
        }
    }

    async connectFromOffer(incomingOffer) {
        this.initConnection();
        await this.addIceCandidate(rtcPeerConnection);

        await this.rtcPeerConnection.setRemoteDescription(incomingOffer)
        let answer = await this.rtcPeerConnection.createAnswer();
        await this.rtcPeerConnection.setLocalDescription(answer);
        await this.signalingManager.sendAnswer(peerId, answer);
    }

    initConnection() {
        let rtcPeerConnection = new RTCPeerConnection();
        //TODO: if exists: in case of reconnect?
        this.rtcPeerConnection = rtcPeerConnection;
        rtcPeerConnection.onconnectionstatechange = ev => this.onConnectionStateChange(ev); 
        
        return rtcPeerConnection
    }

    onConnectionStateChange(ev) {
        console.info(this.rtcPeerConnection.connectionState);
    }

    addIceCandidate(rtcPeerConnection) {
        //adding ice candidate - should be a pingpong
        /* 
            Note: In a real-world scenario in which the two peers aren't running in the same context, the process is a bit more involved;
            each side provides, one at a time, a suggested way to connect (for example, UDP, UDP with a relay, TCP, etc.) by calling RTCPeerConnection.addIceCandidate(),
            and they go back and forth until agreement is reached.
            But here, we just accept the first offer on each side, since there's no actual networking involved. 
        */
        return new Promise((resolve, reject) => {
            rtcPeerConnection.onicecandidate = e => {
                //tdo whats the point of !e.candidate
                let candidate = !e.candidate || remoteConnection.addIceCandidate(e.candidate).catch(handleAddCandidateError);
                resolve(candidate);
                return candidate;
            }
        })
    }

    openChannel() {

    }
}

export {
    P2pConnection
}