class P2pConnection {
    constructor(localId, remoteId, signalingManager, logInfo, logError) {
        this.localId = localId;
        this.remoteId = remoteId;
        this.rtcPeerConnection = null;
        this.signalingManager = signalingManager;
        this.logInfo = logInfo;
        this.logError = logError;

    }

    async connect() {
        try {   
            let descResolve =  null;
            let descReject = null;
    
            this.descPromise = new Promise((resolve, reject) => {
                descResolve = resolve;
                descReject = reject;
            });
    
            this.descPromise.resolve = descResolve;
            this.descPromise.reject = descReject;


            this.logInfo(`start connect`);
            this.initConnection();

            let icePromise = this.addIceCandidate(this.rtcPeerConnection);


            this.logInfo(`adding remote channel`);
            this.rtcPeerConnection.createDataChannel('chat');

            this.logInfo(`adding creating offer`);
            let offer = await this.rtcPeerConnection.createOffer(); // can contain constraints, like to support audio, video etc
            this.logInfo(`set local desc`);
            await this.rtcPeerConnection.setLocalDescription(offer);
            this.logInfo(`send offer by signaling server`);
            let remoteAnswer = await this.signalingManager.sendOffer(this.remoteId, offer); // remote receive offer, set it as remotedesc, then returns answer
            this.logInfo(`received answer.. setting remote desc`, remoteAnswer);
            await this.rtcPeerConnection.setRemoteDescription(remoteAnswer);
            this.descPromise.resolve();
            await icePromise;
            this.logInfo(`adding ice candidate`);
            

            this.logInfo(`finish connection`);
        }
        catch (ex) {
            console.error(ex);
        }
    }

    async connectFromOffer(incomingOffer) {
        this.logInfo(`incoming offer`, incomingOffer);
        this.initConnection();

        let descResolve =  null;
        let descReject = null;

        this.descPromise = new Promise((resolve, reject) => {
            descResolve = resolve;
            descReject = reject;
        });

        this.descPromise.resolve = descResolve;
        this.descPromise.reject = descReject;

        this.logInfo(`adding ice candidate`);
        let icePromise = this.addIceCandidate(this.rtcPeerConnection);

        this.logInfo(`setting remote desc`);
        await this.rtcPeerConnection.setRemoteDescription(incomingOffer)
        this.logInfo(`creating answer`);
        let answer = await this.rtcPeerConnection.createAnswer();
        this.logInfo(`creating set local desc`);
        await this.rtcPeerConnection.setLocalDescription(answer);
        this.logInfo(`send answer by remote desc`);
        await icePromise;
        await this.signalingManager.sendAnswer(this.remoteId, answer);
        this.logInfo(`finish connection`);
    }

    initConnection() {
        let server = { urls: "stun:stun.l.google.com:19302" };

        let rtcPeerConnection = new RTCPeerConnection({ iceServers: [server,  /*{ url: 'turn:homeoturn.bistri.com:80', username: 'homeo', credential: 'homeo' }*/] });
        //TODO: if exists: in case of reconnect?
        rtcPeerConnection.onaddstream = e => {
            console.info('streammm');  v2.srcObject = e.stream;
        }
            
        rtcPeerConnection.ondatachannel = e => {
            console.info('data channelll');
            let channel = e.channel;
            channel.onopen = () => this.logInfo("Chat!");
            channel.onmessage = e => this.logInfo(e.data);
        };

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
               this.logInfo(`e.candidate ${JSON.stringify(e.candidate)}`)
                // let candidate = !e.candidate || this.rtcPeerConnection.addIceCandidate(e.candidate).catch(console.error);
                try {
                    if (!e.candidate) {
                        // seems like not needed
                        //let candidate = this.rtcPeerConnection.addIceCandidate(e.candidate);
                        resolve();
                    }
                    else {
                        if (this.descPromise)
                        {
                            this.descPromise.then(() =>  {
                                console.info('ice crush!')
                                let candidate = this.rtcPeerConnection.addIceCandidate(e.candidate);
                            })
                        }
                        
                    }
                }
                catch (ex) {
                    console.error(ex);
                    reject(ex);
                }
  
                return e.candidate;
            }
        })
    }

    openChannel() {

    }
}

export {
    P2pConnection
}