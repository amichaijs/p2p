class P2pConnection {
    constructor(localId, remoteId, signalingManager, logInfo, logError) {
        this.localId = localId;
        this.remoteId = remoteId;
        this.rtcPeerConnection = null;
        this.signalingManager = signalingManager;
        this.logInfo = logInfo;
        this.logError = logError;

    }

    initlol() {
        this.logInfo('init')
        let server = { urls: "stun:stun.l.google.com:19302" };
        this.dc = null;
        this.rtcPeerConnection = new RTCPeerConnection({ iceServers: [server] });
        this.rtcPeerConnection.onaddstream = e => 
        { 
            this.logInfo('on add stream');
            document.querySelector('main-component').elements.v2.srcObject = e.stream;
        }
        this.rtcPeerConnection.ondatachannel = e => { 
            this.logInfo('ondatachhanel');
            this.dcInit(this.dc = e.channel);
        }
        this.rtcPeerConnection.oniceconnectionstatechange = e => this.logInfo(this.rtcPeerConnection.iceConnectionState);
        this.haveGum = Promise.resolve();
        /*this.haveGum = navigator.mediaDevices.getUserMedia({video:true, audio:true})
        .then(stream =>  {
            this.logInfo('got gum!');
            let v1 = document.querySelector('main-component').elements.v1
            v1.srcObject = stream;
            this.pc.addStream(stream)
            return stream;
        }).catch(this.logError);*/
            
  
    }
    dcInit() {
        this.dc.onopen = () => this.logInfo("Chat!");
        this.dc.onmessage = e => this.logInfo(e.data);
    }

    createOffer() {
        this.initlol();
        this.dcInit(this.dc =this.rtcPeerConnection.createDataChannel("chat"));
        this.haveGum.then(() => {
            this.logInfo('create offer')
            this.rtcPeerConnection.createOffer()
        }).then(d =>  {
            this.logInfo('setLocalDescription')
            this.rtcPeerConnection.setLocalDescription(d)
        }).then(() => {
            this.logInfo('setLocalDescription FINISH');
        })
        .catch(this.logError);
        this.rtcPeerConnection.onicecandidate = e => {
            this.logInfo(`e.candidate ${JSON.stringify(e.candidate)}`);
            if (e.candidate) return;
            let offer = this.rtcPeerConnection.localDescription;
            this.signalingManager.sendOffer(this.remoteId, offer)
            .then(answer => this.acceptAnswer(answer))
        }
    }

     acceptOffer(incomingOffer) {
        this.initlol();
        if (this.rtcPeerConnection.signalingState != "stable") return;
        this.haveGum.then(() =>  {        
                this.logInfo(`set remote desc`);
                this.rtcPeerConnection.setRemoteDescription(incomingOffer)
                .then(() => { 
                    this.logInfo(`create answer`);
                    this.rtcPeerConnection.createAnswer();
                } ).then(d => {
                    this.logInfo(`setLocalDescription`);
                    this.rtcPeerConnection.setLocalDescription(d)
                })
                .catch(this.logError);
            this.rtcPeerConnection.onicecandidate = e => {
                this.logInfo(`e.candidate ${JSON.stringify(e.candidate)}`);
                if (e.candidate) return;
                let answer = this.rtcPeerConnection.localDescription;
                this.logInfo('sending answer')
                this.signalingManager.sendAnswer(this.remoteId, answer);
            };
        });

    };

    acceptAnswer(answer) {
        this.logInfo('accept answer')
        if (this.rtcPeerConnection.signalingState != "have-local-offer") return;
        this.rtcPeerConnection.setRemoteDescription(answer).catch(this.logError);
    };

    bindChatChannel() {
        this.chatChannel.onopen = () => this.logInfo("Chat!");
        this.chatChannel.onmessage = e => this.logInfo(e.data);

    }

    async connect() {
        try {    
            this.logInfo(`start connect`);
            this.initConnection();

            this.logInfo(`adding data channel`);
            this.chatChannel =  this.rtcPeerConnection.createDataChannel('chat');
            this.bindChatChannel();

            await this.media;

            this.logInfo(`start listen ice candidate`);
            let icePromise = this.addIceCandidate(this.rtcPeerConnection);

            this.logInfo(`adding creating offer`);
            let localOffer = await this.rtcPeerConnection.createOffer(); // can contain constraints, like to support audio, video etc

            this.logInfo(`set local desc`);
            await this.rtcPeerConnection.setLocalDescription(localOffer);

            this.logInfo(`await ice candidate`);
            await icePromise;

            this.logInfo(`send offer by signaling server`);
            // can send original offer without waiting for ice server, unlike answer. but it's better practice this way.
            let offerForRemote = this.rtcPeerConnection.localDescription;
            let remoteAnswer = await this.signalingManager.sendOffer(this.remoteId, offerForRemote); // remote receive offer, set it as remotedesc, then returns answer
            
            this.logInfo(`received answer.. setting remote desc`, remoteAnswer);
            await this.rtcPeerConnection.setRemoteDescription(remoteAnswer);   

            this.logInfo(`finish connection`);
        }
        catch (ex) {
            console.error(ex);
        }
    }

    async connectFromOffer(incomingOffer) {
        this.logInfo(`incoming offer`, incomingOffer);
        this.initConnection();

        await this.media;

        this.logInfo(`start listen ice candidate`);
        let icePromise = this.addIceCandidate(this.rtcPeerConnection);


        this.logInfo(`setting remote desc`);
        await this.rtcPeerConnection.setRemoteDescription(incomingOffer);

        this.logInfo(`creating answer`);
        let answerForLocal = await this.rtcPeerConnection.createAnswer(); //creates SDP without candidate and without external ip.

        this.logInfo(`set local desc`);
        await this.rtcPeerConnection.setLocalDescription(answerForLocal);

        this.logInfo(`await ice candidate`);
        await icePromise;

        this.logInfo(`send answer by remote desc`);
        let answerToRemote = this.rtcPeerConnection.localDescription // after ice server finsh, uses updated version of the SDP with the candidate and external ip
        this.signalingManager.sendAnswer(this.remoteId, answerToRemote);
        
        this.logInfo(`finish connection`);
    }

    initConnection() {
        let server = { urls: "stun:stun.l.google.com:19302" };

        //let rtcPeerConnection = new RTCPeerConnection({ iceServers: [server] });
        let rtcPeerConnection = new RTCPeerConnection({ iceServers: [server,  { url: 'turn:homeoturn.bistri.com:80', username: 'homeo', credential: 'homeo' }] });
        //TODO: if exists: in case of reconnect?
        rtcPeerConnection.remoteStream = null;
        rtcPeerConnection.ontrack = ev => {
            this.logInfo('streammm');  
            if (!rtcPeerConnection.remoteStream) {
                rtcPeerConnection.remoteStream = new MediaStream(ev.track)
            }
            rtcPeerConnection.remoteStream.addTrack(ev.track);

            document.querySelector('main-component').elements.v2.srcObject = rtcPeerConnection.remoteStream;
        }
        rtcPeerConnection.ontra
            
        rtcPeerConnection.ondatachannel = e => {
            this.logInfo('data channelll');
            this.chatChannel = e.channel;
            this.bindChatChannel();
        };

        rtcPeerConnection.oniceconnectionstatechange = e => {
            this.logInfo(rtcPeerConnection.iceConnectionState);
        }

        this.media = navigator.mediaDevices.getUserMedia({video:true, audio:true})
        .then(stream => {
            let tracks = stream.getTracks();
            for (const track of tracks) {
                this.rtcPeerConnection.addTrack(track, stream);
            }

            this.rtcPeerConnection.addStream(document.querySelector('main-component').elements.v1.srcObject = stream);
            return stream;

        }).catch(this.logError);


        //rtcPeerConnection.onconnectionstatechange = ev => this.onConnectionStateChange(ev); 

        this.rtcPeerConnection = rtcPeerConnection;
        
        return rtcPeerConnection
    }

    onConnectionStateChange(ev) {
        this.logInfo(this.rtcPeerConnection.connectionState);
    }

    addIceCandidate(rtcPeerConnection) {
        return new Promise((resolve, reject) => {
            rtcPeerConnection.onicecandidate = e => {
               this.logInfo(`e.candidate ${JSON.stringify(e.candidate)}`)
                try {
                    if (!e.candidate) {
                        resolve();
                    }
                }
                catch (ex) {
                    console.error(ex);
                    reject(ex);
                }
            }
        })
    }

    openChannel() {

    }
}

export {
    P2pConnection
}


/*

--== peer 1 ==--

have gum!

create offer

set local desc

finish local desc

e.candidate {"candidate":"candidate:2530088836 1 udp 2122260223 192.168.1.106 56991 typ host generation 0 ufrag XaZB network-id 1","sdpMid":"3","sdpMLineIndex":0}

e.candidate {"candidate":"candidate:2530088836 1 udp 2122260223 192.168.1.106 56992 typ host generation 0 ufrag XaZB network-id 1","sdpMid":"4","sdpMLineIndex":1}

e.candidate {"candidate":"candidate:2530088836 1 udp 2122260223 192.168.1.106 56993 typ host generation 0 ufrag XaZB network-id 1","sdpMid":"5","sdpMLineIndex":2}

e.candidate {"candidate":"candidate:3628985204 1 tcp 1518280447 192.168.1.106 9 typ host tcptype active generation 0 ufrag XaZB network-id 1","sdpMid":"3","sdpMLineIndex":0}

e.candidate {"candidate":"candidate:3628985204 1 tcp 1518280447 192.168.1.106 9 typ host tcptype active generation 0 ufrag XaZB network-id 1","sdpMid":"4","sdpMLineIndex":1}

e.candidate {"candidate":"candidate:3628985204 1 tcp 1518280447 192.168.1.106 9 typ host tcptype active generation 0 ufrag XaZB network-id 1","sdpMid":"5","sdpMLineIndex":2}

e.candidate {"candidate":"candidate:394662192 1 udp 1686052607 <your ip> 56991 typ srflx raddr 192.168.1.106 rport 56991 generation 0 ufrag XaZB network-id 1","sdpMid":"3","sdpMLineIndex":0}

e.candidate {"candidate":"candidate:394662192 1 udp 1686052607 <your ip> 56992 typ srflx raddr 192.168.1.106 rport 56992 generation 0 ufrag XaZB network-id 1","sdpMid":"4","sdpMLineIndex":1}

e.candidate {"candidate":"candidate:394662192 1 udp 1686052607 <your ip> 56993 typ srflx raddr 192.168.1.106 rport 56993 generation 0 ufrag XaZB network-id 1","sdpMid":"5","sdpMLineIndex":2}

e.candidate null

connection state: checking

// sending offer manually (copy paste) to peer 2

// peer 2 calculates answer

// copy & paste answer from peer 2 at peer 1 manually

accept answer & set remote desc

connection state: connected

stream

finish set remote desc

Chat!

*/


/*
--== peer 2 ==--

have gum!

stream

set remote desc

set local desc

checking

connected

e.candidate {"candidate":"candidate:2530088836 1 udp 2122260223 192.168.1.106 54457 typ host generation 0 ufrag YsQ/ network-id 1","sdpMid":"3","sdpMLineIndex":0}

e.candidate null

datachannel

Chat!
*/


/*
PEER 1
opened: your id 46
init
create offer
setLocalDescription
setLocalDescription FINISH
e.candidate {"candidate":"candidate:2530088836 1 udp 2122260223 192.168.1.106 62103 typ host generation 0 ufrag UwTQ network-id 1","sdpMid":"1","sdpMLineIndex":0}
e.candidate {"candidate":"candidate:394662192 1 udp 1686052607 84.109.241.192 62103 typ srflx raddr 192.168.1.106 rport 62103 generation 0 ufrag UwTQ network-id 1","sdpMid":"1","sdpMLineIndex":0}
e.candidate {"candidate":"candidate:3628985204 1 tcp 1518280447 192.168.1.106 9 typ host tcptype active generation 0 ufrag UwTQ network-id 1","sdpMid":"1","sdpMLineIndex":0}
e.candidate null
checking
accept answer
connected
Chat!

PEER 2
opened: your id 47
init
set remote desc
create answer
setLocalDescription
checking
e.candidate {"candidate":"candidate:2530088836 1 udp 2122260223 192.168.1.106 55489 typ host generation 0 ufrag X/VN network-id 1","sdpMid":"1","sdpMLineIndex":0}
connected
e.candidate null
sending answer
ondatachhanel
Chat!

*/