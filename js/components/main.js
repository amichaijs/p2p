import { MdcComponent, defineComponent } from './mdc-component.js'
import { generateRandomId } from '../helpers.js'
import { P2pManager } from '../connection/p2pManager.js';
import { logger } from '../logger.js';
import { cameraManager } from '../cameraManager.js';

/*
    - create random "UserId" for each machine. it should persists until browser close.
    - the peer ids from STUN server are temporary and may change. thus each peer need to update on peerId change, using the UserId in metadata

*/

const signalServerUrl = "ws://localhost:5000"

let template = html`
<div id="main">
    <div id="welcome">
        <h3 id="welcomeTitle"  class="loading" >Just a moment...</h3>
        <mdc-button hidden id="btnStart"></mdc-button>
    </div>
    <!-- <log-component id="logComponent"></log-component> -->
    <div hidden id="videoContainer">
        <video id="localVideo" class="video" autoplay muted></video>
        <div id="remoteVideosContainer">
            <!-- <video id="remoteVideo" class="video" autoplay></video> -->
        </div>
    </div>
</div>`;

let style = html`
<style>
    [hidden] {
        display:none !important;
    }

    :host { 
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
    } 

    #main {
        width: 100%;
        height: 100%;
        background: white;
    }

    #welcome {
        display:flex;
        flex-flow: column;
        justify-content:center;
        align-items: center;
        text-align:center;
        width:100%;
        height:100%;
    }

    #welcomeTitle {
        margin-bottom: 40px;
    }

    #logComponent {
        display:none;
    }

    #localVideo {
        position:absolute;
        width: 30%;
        bottom: 20px;
        left: 20px;
        z-index:1;
        transform: rotateY(180deg);
        max-width: 240px;
    }

    #remoteVideosContainer { 
        --column-count: 1;
        display:grid;
        grid-template-columns: repeat(var(--column-count), 1fr);
        align-items: center;
        justify-items: center;
        gap: 6px;
        width: 100%;
        height: 100%;
        /* width: 100%; */
        /* height: 100%; */
    }

    .remoteVideoWrapper {
        display: flex;
        justify-content: center;
        width: 100%;
        height: 100%;
        animation: 400ms cubic-bezier(0.74, 1.19, 0.34, 1.05) fade-in;
}
    }

    .remoteVideoWrapper video {
        object-fit: cover;   
        width:100%;
    }

   /* #remoteVideo { 
        width: 100%;
        height: 100%;
        object-fit: cover;
        max-width: 800px;
    }*/

    .video {
        width:100%;
    }

    #videoContainer {
        width:100%;
        height:100%;
        background: url(resources/webrtc.png), url(resources/webrtc.png) 45px 75px;
        background-size: 90px 52px;      
    }

    .loading {
        animation: 0.7s linear infinite alternate resize-loop;
    }

    .fail {
        transform: rotate(21deg);
        color: red;
    }

    @keyframes resize-loop {
        0% {
            transform:scale(1.1)
        }

        100% {
            transform:scale(1)
        }
    }

    @media (min-width: 768px) {
        #remoteVideo { 
            height: auto;
        }
    }
</style>`;

class MainComponent extends MdcComponent {
    constructor() {
        super();
        this.peers = new Map();
        this.p2pManager = null;
        this.remoteId = new URLSearchParams(window.location.search).get('id');
        this.remoteVideos = [];
    }

    isFromInvite() {
        return !!this.remoteId;
    }

    async afterRender() {
        this.loadElements();
        logger.onLog(() => this.onLog);
        this.initP2pManager();
        this.connectServer();
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.p2pManager.hasPeersOrWsConnection()) {
                this.connectServer();
            }
        })
    }

    setWelcome() {
        let welcomeTitle;
        let welcomeBtnTitle;
        let buttonListener;

        if (this.isFromInvite()) {
            welcomeTitle = 'You got a call!';
            welcomeBtnTitle = 'Answer!'
            buttonListener = () => this.connectPeer();
        }
        else {
            welcomeTitle = 'Copy link to your peer!';
            welcomeBtnTitle = 'Copy Link!'
            buttonListener = () => this.addPeerLinkToClipboard();
        }

        this.elements.welcomeTitle.classList.remove('fail');
        this.elements.welcomeTitle.classList.remove('loading');
        this.elements.welcomeTitle.setValue(welcomeTitle)
        this.elements.btnStart.setValue(welcomeBtnTitle)

        this.elements.btnStart.addEventListener("click", buttonListener);
        this.elements.btnStart.hidden = false;

        this.elements.localVideo.onclick = async () => {
            if (navigator.mediaDevices.getDisplayMedia) {
                let stream = await navigator.mediaDevices.getDisplayMedia();
                this.p2pManager.setLocalStream(stream);
            }
            else {
                cameraManager.toggleCamera();
            }
        }
    }

    async addPeerLinkToClipboard() {
        this.tryFullScreen();
        let url = `${window.location.href.split("?")[0]}?id=${this.localId}`
        navigator.clipboard.writeText(url).catch(logger.error);
        this.elements.btnStart.setValue('Copied!')
    }

    createRemoteVideo() {
        let video = document.createElement('video');
        video.muted = true;
        video.autoplay = true;
        video.className = 'remoteVideo';

        let videoContainer = document.createElement('div');
        videoContainer.className = 'remoteVideoWrapper';

        videoContainer.appendChild(video);
        this.remoteVideos.push(video);
        this.elements.remoteVideosContainer.appendChild(videoContainer);

        this.updateVideoStyle();

        return { wrapper: videoContainer, video: video } ;
    }

    updateVideoStyle() {
        let vidCount = this.elements.remoteVideosContainer.querySelectorAll('video').length;
        let colCount = Math.ceil(Math.sqrt(vidCount));
        this.elements.remoteVideosContainer.style.setProperty('--column-count', colCount);
    }

    initP2pManager() {
        this.p2pManager = new P2pManager(signalServerUrl);
        this.p2pManager.localVideoElement = this.elements.localVideo;
        //this.p2pManager.remoteVideoElement = this.elements.remoteVideo;
        this.p2pManager.onNewConnection = async connection => {
            this.elements.welcome.hidden = true;
            this.elements.videoContainer.hidden = false;
            
            await cameraManager.setCamera();
            //connection.setMediaStream(cameraManager.stream)
            let { wrapper,  video: remoteVideo } = this.createRemoteVideo();
            connection.setRemoteVideo(remoteVideo);
            connection.on('disconnected', () => {
                console.info(`peer ${connection.remote.id} disconnected - removing video`)
                wrapper.remove();
            });
            connection.on('conferenceTrack', ({ track, stream }) => {
                let { wrapper: conferenceWrapper, video: conferenceVideo } = this.createRemoteVideo();
                conferenceVideo.srcObject = stream;
                stream.addEventListener('removetrack', ev => {
                    if (stream.getTracks().length == 0) {
                        conferenceWrapper.remove();
                    }
                })
            });
            // not support in android.. yet
            // this.elements.localVideo.onloadedmetadata = () => {
            //     this.elements.localVideo.requestPictureInPicture().then(logger.info).catch(logger.error);
            // }
        };
        this.p2pManager.onDisconnectSignalingServer = () => {
            //TODo
        }

        cameraManager.on('cameraChange', () => {
            this.p2pManager.setLocalStream(cameraManager.stream);
            if (!this.elements.localVideo.srcObject) {
                this.elements.localVideo.srcObject = cameraManager.stream;
            }
        })
    }

    onLog(msg, level) {
       /* if (level == 'error') {
            this.elements.logComponent.logError(msg);
        }
        else {
            this.elements.logComponent.logInfo(msg);
        }    */ 
    }

    async answerCall() { 
        await this.connectSignalingPromise;
        await this.connectPeer();
    }

    async connectServer() {
        let failed = false;
        try {
            logger.info('connecting signaling server')
            this.connectSignalingPromise = this.p2pManager.connectSignalingServer();
            this.localId = await this.connectSignalingPromise;
            logger.info(`opened: your id ${this.localId}`);
            if (this.localId) {
                this.elements.welcomeTitle.classList.remove('loading');
                this.setWelcome();
            }
            else {
                failed = true;
            }
        }
        catch(ex) {
            logger.error(ex);
            failed = true;
        }

        if (failed) {
            logger.info('failed connecting signaling server')
            this.elements.welcomeTitle.classList.add('fail');
            this.elements.welcomeTitle.setValue('Ouw failed to connect server :( trying again...');
            setTimeout(() => { 
                    this.connectServer()
            }, 5000);
        }

    }

    async connectPeer() {
        this.tryFullScreen();
        if (!this.remoteId) {
            return;
        } 

        this.elements.welcomeTitle.setValue('Connecting peer...')
        let res = await this.p2pManager.connectPeer(this.remoteId);
    }

    async tryFullScreen() {
        if (!document.fullscreen) {
            return this.elements.main.requestFullscreen().catch(logger.error);
        }
    }
}


defineComponent('main-component', MainComponent, { template, style });