import { logger } from '../logger.js'

class P2pConnection {
    constructor(localId, remoteId, signalingManager, localVideoElement, remoteVideoElement) {
        this.localId = localId;
        this.remoteId = remoteId;
        this.rtcPeerConnection = null;
        this.signalingManager = signalingManager;
        this.localVideoElement = localVideoElement;
        this.remoteVideoElement = remoteVideoElement;
    }

    bindChatChannel() {
        this.chatChannel.onopen = () => logger.info("Chat!");
        this.chatChannel.onmessage = e => logger.info(e.data);
    }

    async connect() {
        try {    
            logger.info(`start connect`);
            this.initConnection();

            logger.info(`adding data channel`);
            this.chatChannel =  this.rtcPeerConnection.createDataChannel('chat');
            this.bindChatChannel();

            await this.media;

            logger.info(`start listen ice candidate`);
            let icePromise = this.addIceCandidate(this.rtcPeerConnection);

            logger.info(`adding creating offer`);
            let localOffer = await this.rtcPeerConnection.createOffer(); // can contain constraints, like to support audio, video etc

            logger.info(`set local desc`);
            await this.rtcPeerConnection.setLocalDescription(localOffer);

            logger.info(`await ice candidate`);
            await icePromise;

            logger.info(`send offer by signaling server`);
            // can send original offer without waiting for ice server, unlike answer. but it's better practice this way.
            let offerForRemote = this.rtcPeerConnection.localDescription;
            let remoteAnswer = await this.signalingManager.sendOffer(this.remoteId, offerForRemote); // remote receive offer, set it as remotedesc, then returns answer
            
            logger.info(`received answer.. setting remote desc`, remoteAnswer);
            await this.rtcPeerConnection.setRemoteDescription(remoteAnswer);   

            logger.info(`finish connection`);
        }
        catch (ex) {
            logger.error(ex);
        }
    }

    async connectFromOffer(incomingOffer) {
        logger.info(`incoming offer`, incomingOffer);
        this.initConnection();

        await this.media;

        logger.info(`start listen ice candidate`);
        let icePromise = this.addIceCandidate(this.rtcPeerConnection);

        logger.info(`setting remote desc`);
        await this.rtcPeerConnection.setRemoteDescription(incomingOffer);

        logger.info(`creating answer`);
        let answerForLocal = await this.rtcPeerConnection.createAnswer(); //creates SDP without candidate and without external ip.

        logger.info(`set local desc`);
        await this.rtcPeerConnection.setLocalDescription(answerForLocal);

        logger.info(`await ice candidate`);
        await icePromise;

        logger.info(`send answer by remote desc`);
        let answerToRemote = this.rtcPeerConnection.localDescription // after ice server finsh, uses updated version of the SDP with the candidate and external ip
        this.signalingManager.sendAnswer(this.remoteId, answerToRemote);
        
        logger.info(`finish connection`);
    }

    initConnection() {
        let iceServers =
        [
            { urls: "stun:stun4.l.google.com:19302" }, 
            {
                url: 'turn:numb.viagenie.ca',
                credential: 'muazkh',
                username: 'webrtc@live.com'
            }
        ]

        let rtcPeerConnection = new RTCPeerConnection({ iceServers: iceServers });

        rtcPeerConnection.remoteStream = null;
        rtcPeerConnection.ontrack = ev => {
            logger.info('ontrack');  
            if (!rtcPeerConnection.remoteStream) {
                rtcPeerConnection.remoteStream = new MediaStream();
            }
            rtcPeerConnection.remoteStream.addTrack(ev.track);

            this.localVideoElement.srcObject = rtcPeerConnection.remoteStream;
        }
        rtcPeerConnection.ontra
            
        rtcPeerConnection.ondatachannel = e => {
            logger.info('ondatachannel');
            this.chatChannel = e.channel;
            this.bindChatChannel();
        };

        rtcPeerConnection.oniceconnectionstatechange = e => {
            logger.info(rtcPeerConnection.iceConnectionState);
        }

        this.media = navigator.mediaDevices.getUserMedia({video:true, audio:true})
        .then(stream => {
            let tracks = stream.getTracks();
            for (const track of tracks) {
                this.rtcPeerConnection.addTrack(track, stream);
            }

            this.remoteVideoElement.srcObject = stream
            return stream;

        }).catch(logger.error);


        rtcPeerConnection.onconnectionstatechange = ev => logger.info(this.rtcPeerConnection.connectionState);

        this.rtcPeerConnection = rtcPeerConnection;
        
        return rtcPeerConnection
    }

    onConnectionStateChange(ev) {
        logger.info(this.rtcPeerConnection.connectionState);
    }

    addIceCandidate(rtcPeerConnection) {
        return new Promise((resolve, reject) => {
            rtcPeerConnection.onicecandidate = e => {
               logger.info(`e.candidate ${JSON.stringify(e.candidate)}`)
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