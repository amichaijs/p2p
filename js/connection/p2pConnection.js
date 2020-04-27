import { Deferred, EventManager } from '../helpers.js'
import { Logger } from '../logger.js'
import { cameraManager } from '../cameraManager.js';

const DataChannels = {
    Communication: 0
}

class PeerInfo {
    constructor(id, videoElement) {
        this.id = id
        this.videoElement = videoElement || null;
        this.stream = null;
        this.rtpTracks = {
            video: null,
            audio: null
        }
    }
    
    addRtpTrack(rtpTrack) {
        if (rtpTrack.track.kind === 'video') {
            this.rtpTracks.video = rtpTrack;
        }
        else if (rtpTrack.track.kind === 'audio') {
            this.rtpTracks.audio = rtpTrack;
        }

    }

    playVideo() {
        if (this.videoElement) {
            this.videoElement.srcObject = this.stream;
        }
    }
}

class P2pConnection {
    constructor(localId, remoteId, isHost, signalingManager, remoteVideoElement) {
        this.logger = new Logger(`[remote:${remoteId}]`);
        this.local = new PeerInfo(localId);
        this.remote = new PeerInfo(remoteId, remoteVideoElement);
        this.rtcPeerConnection = null;
        this.signalingManager = signalingManager;
        this.negotiating = false;
        this.isHost = isHost;
        this.deferred = new Deferred();
        this.events = new EventManager('disconnected', 'conferenceTrack');
        this.finishedFirstConnection = false;
    }

    on(eventName, callback) {
        return this.events.on(eventName, callback);
    }

    off(eventName, callback) {
        return this.events.off(eventName, callback);
    }

    setCommunicationChannel(channel) {
        this.communicationChannel = channel;
        this.communicationChannel.onopen = () => this.logger.info("communication channel open!");
        this.communicationChannel.onmessage = e =>  {
                this.logger.info(e.data);
        }
    }

    async connect() {
        try {
            this.logger.info(`start connect`);
            await this.initConnection();

            this.logger.info(`adding data channel`);
            let communicationChannel = this.rtcPeerConnection.createDataChannel('communication', { id: DataChannels.Communication});
            this.setCommunicationChannel(communicationChannel);

            let stream = await cameraManager.setCamera();
            this.setMediaStream(stream);

            await this.negotiate();
            this.finishedFirstConnection = true;
            
            this.logger.info(`finish connection`);
            return this.deferred;
        }
        catch (ex) {
            this.logger.error(ex);
        }
    }

    async negotiate() {
        if (this.negotiating) {
            return;
        };

        this.logger.info(`start listen ice candidate`);
        this.icePromise = this.addIceCandidate(this.rtcPeerConnection);
        
        this.logger.info(`adding creating offer`);
        let localOffer = await this.rtcPeerConnection.createOffer(); // can contain constraints, like to support audio, video etc

        this.logger.info(`set local desc`);
        await this.rtcPeerConnection.setLocalDescription(localOffer);

        this.logger.info(`await ice candidate`);
        await this.icePromise;

        this.logger.info(`send offer by signaling server`);
        // can send original offer without waiting for ice server, unlike answer. but it's better practice this way.
        let offerForRemote = this.rtcPeerConnection.localDescription;
        let remoteAnswer = await this.signalingManager.sendOffer(this.remote.id, offerForRemote); // remote receive offer, set it as remotedesc, then returns answer

        this.logger.info(`received answer.. setting remote desc`, remoteAnswer);
        await this.rtcPeerConnection.setRemoteDescription(remoteAnswer);

    }

    async connectFromOffer(incomingOffer) {
        this.isHost = true;

        this.logger.info(`incoming offer`, incomingOffer);
        await this.initConnection();

        let stream = await cameraManager.setCamera();
        this.setMediaStream(stream);

        await this.negotiateBack(incomingOffer);

        this.finishedFirstConnection = true;

        this.logger.info(`finish connection`);
        return this.deferred;
    }

    async negotiateBack(incomingOffer) {
        try {   
            this.logger.info(`start listen ice candidate`);
            this.icePromise = this.addIceCandidate(this.rtcPeerConnection);

            this.logger.info(`setting remote desc`);
            await this.rtcPeerConnection.setRemoteDescription(incomingOffer);

            this.logger.info(`creating answer`);
            let answerForLocal = await this.rtcPeerConnection.createAnswer(); //creates SDP without candidate and without external ip.

            this.logger.info(`set local desc`);
            await this.rtcPeerConnection.setLocalDescription(answerForLocal);

            this.logger.info(`await ice candidate`);
            await this.icePromise;

            this.logger.info(`send answer by remote desc`);
            let answerToRemote = this.rtcPeerConnection.localDescription // after ice server finsh, uses updated version of the SDP with the candidate and external ip
            this.signalingManager.sendAnswer(this.remote.id, answerToRemote);
        }
        catch (ex) {
            this.logger.error(ex);
        }
    }

    async initConnection() {
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

        rtcPeerConnection.ontrack = ev => {
            this.logger.info('ontrack');
            let [inComingStream] = ev.streams
            this.remote.addRtpTrack(ev.receiver);
            let isConferenceTrack = !this.isHost && ev.track.kind === "video" && inComingStream !== this.remote.stream;
            if (!this.remote.stream) {
                this.remote.stream = inComingStream || new MediaStream();
            }

            // if streamless track / inbound, create one and build it from tracks.
            if (!inComingStream) {
                this.remote.stream.addTrack(ev.track);
            }

            this.remote.playVideo();

            if (isConferenceTrack) {
                this.logger.info(`conferenceTrack ${ev.track.kind} and ${ev.track.id}`)
                this.events.dispatchEvent('conferenceTrack', { track: ev.track, stream: inComingStream });
            } 

            this.onRemoteTrack(ev.track, inComingStream);   
        }

        // mostly for when new track added.
        rtcPeerConnection.onnegotiationneeded = e => {
            this.logger.info('onnegotiationneeded');
            if (!this.finishedFirstConnection) {
                this.logger.info('finishedFirstConnection = false');
            }
            else if (this.negotiating) {
                this.logger.info('already negotiating');

            }
            else {
                this.negotiate();
            }
        }

        rtcPeerConnection.ondatachannel = e => {
            this.logger.info('ondatachannel');
            switch (e.channel.id) {
                case DataChannels.Communication:
                    this.setCommunicationChannel(e.channel);
                    break;
            }
 
        };

        rtcPeerConnection.oniceconnectionstatechange = e => {
            this.logger.info(rtcPeerConnection.iceConnectionState);
            if (this.rtcPeerConnection.iceConnectionState === 'disconnected') {
                // if (this.remote.stream) {
                //     this.logger.info('remove existing stream from conference')
                //     let senders = this.rtcPeerConnection.getSenders();
                //     for (let sender of senders) {
                //         this.logger.info(`remove track from con ${sender}`)
                //         this.rtcPeerConnection.removeTrack(sender);
                //     }

                //     let tracks = this.remote.stream.getTracks();
                //     for (let track of tracks) {
                //         this.remote.stream.removeTrack(track);
                //     }
                // }
                
                this.onDisconnected();
            }
        }

        rtcPeerConnection.onsignalingstatechange = () => this.negotiating = this.rtcPeerConnection.signalingState != "stable";

        rtcPeerConnection.onconnectionstatechange = ev => {
            this.logger.info(`onconnectionstatechange: ${this.rtcPeerConnection.connectionState}`);
            switch (this.rtcPeerConnection.connectionState) {
                case 'connected':
                    this.deferred.resolve();
                    break;
            
                default:
                    break;
            }
        }

        this.rtcPeerConnection = rtcPeerConnection;

        return rtcPeerConnection
    }


    onConnectionStateChange(ev) {
        this.logger.info(this.rtcPeerConnection.connectionState);
    }

    addIceCandidate(rtcPeerConnection) {
        return new Promise((resolve, reject) => {
            rtcPeerConnection.onicecandidate = e => {
                this.logger.info(`e.candidate ${JSON.stringify(e.candidate)}`)
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

    setMediaStream(stream) {
        try {
            this.logger.info(`setMediaStream stream:${stream}`)
            if (stream && stream == this.local.stream) {
                this.logger.info('same stream');
                return;
            }

            this.local.stream = stream;

            if (stream) {
                this.logger.info('might be adding tracks..')
                let tracks = stream.getTracks();

                let hasVideoTrack = !!this.local.rtpTracks.video;
                for (const track of tracks) {
                    if (hasVideoTrack) {
                        if (track.kind === 'video') {
                            this.logger.info(`replacing local video track ${this.local.rtpTracks.video.track.id } with ${track.id}`)
                            this.local.rtpTracks.video.replaceTrack(track);
                        }
                    }
                    else {
                        this.logger.info(`adding local track ${track.id}`);
                        let rtpTrack = this.rtcPeerConnection.addTrack(track, stream);
                        this.local.addRtpTrack(rtpTrack);   
                    }
                }
            }
            else {
                this.logger.warn('no stream :(');
            }
        }
        catch (ex) {
            this.logger.error(ex);
        }
    }

    isDisconnected() {
        return !this.rtcPeerConnection || this.rtcPeerConnection.iceConnectionState === 'disconnected'
    }

    onDisconnected() {
        this.events.dispatchEvent('disconnected');
    }

    openChannel() {

    }

    setRemoteVideo(videoElement) {
        this.remote.videoElement = videoElement;
        this.remote.playVideo();
    }

    setOtherRemoteTrack(remoteId, track, stream) {
        this.logger.info(`on another stream from different connection / peer ${remoteId} with stream ${track.id}`)
        this.rtcPeerConnection.addTrack(track, stream);
    }
    
    onRemoteTrack(track, stream) {

    }

    destroy() {

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