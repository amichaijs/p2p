import { MdcComponent, defineComponent } from './mdc-component.js'
import { isMobile } from '../helpers.js'
import { P2pManager } from '../connection/p2pManager.js';
import { logger } from '../logger.js';
import { cameraManager } from '../cameraManager.js';

/*
    - create random "UserId" for each machine. it should persists until browser close.
    - the peer ids from STUN server are temporary and may change. thus each peer need to update on peerId change, using the UserId in metadata

*/

let isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === "127.0.0.1";
const signalServerUrl = isLocalhost ? "ws://localhost:5000" : "wss://js-webrtc-server.herokuapp.com"

let template = html`
<div id="main">
    <div id="welcome">
        <h3 id="welcomeTitle"  class="loading" >Just a moment...</h3>
        <h5 id="yourId" hidden>Your ID: dsff1f1j2</h5>
        <mdc-button hidden id="btnStart"></mdc-button>
    </div>
    <!-- <log-component id="logComponent"></log-component> -->
    <div hidden id="videoContainer">
        <video id="localVideo" class="video" autoplay muted></video>
        <div id="remoteVideosContainer">
            <!-- <video id="remoteVideo" class="video" autoplay></video> -->
        </div>
        <div id="callButtonsContainer">
            <icon-button id="btnEnableFullScreen"></icon-button>
            <icon-button id="btnEnableVideo"></icon-button>
            <icon-button id="btnEnableMic"></icon-button>
            <icon-button id="btnEnableScreenShare"></icon-button>
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

    #yourId {
        margin-bottom:30px;
        margin-top:20px;
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
        --row-count: 1;
        display:flex;
        flex-flow: row wrap;
        /* align-content: center; */
        justify-content: center;
        flex-direction: row;
        background:black;
        width: 100%;
        height: 100%;
        overflow: hidden; /** hides animation fudge up */
    }

    .remoteVideoWrapper {
        display: flex;
        justify-content:center;
        animation: 400ms cubic-bezier(0.74, 1.19, 0.34, 1.05) fade-in;
        width: calc(100% / var(--column-count));
        height: calc(100% / var(--row-count));
        /* flex-grow: 1; if wanting last items to stretch */
        border: 2px black solid;
        box-sizing: border-box;
        /* max-height: calc(100% / var(--column-count))  if flex grow enabled,  when there is single item in one row it over strech;*/
    }


    .remoteVideo {
        object-fit: cover;
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

    #callButtonsContainer {
        height: 80px;
        position: absolute;
        bottom: 0;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: flex-end;
    }

    .disconnected::after {
        content: "Oops...";
        position: absolute;
        width: inherit;
        height: inherit;
        font-size: 7em;
        color: white;
        -webkit-text-stroke: 1px black;
        background: #0000009e;
        vertical-align: -50%;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .landscape video {
        width: 100%;
    }
    
    @media (orientation:portrait)  {
        .remoteVideoWrapper:first-child:nth-last-child(2),
        .remoteVideoWrapper:first-child:nth-last-child(2) ~ .remoteVideoWrapper {
            width:100%;
            height:50%;
        }

        .portrait video {
            width:100%;
        }

        .landscape video {
            object-fit:contain;
        }
    }

    @media (orientation:landscape)  {
        .portrait video {
            height:100%;
        }
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

    @keyframes fade-in {
        from {
            opacity:0;
            transform: scale(0.5);
        }
        to  {
            opacity: 1;
            transform: scale(1);
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
        this.displayStream = null;
    }

    isFromInvite() {
        return !!this.remoteId;
    }

    async afterRender() {
        this.loadElements();
        logger.onLog(() => this.onLog);
        this.initP2pManager();
        this.connectServer();
        /*document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.p2pManager.hasPeersOrWsConnection()) {
                this.connectServer();
            }
        })*/

        this.initCallButtons();
    }

    setWelcome() {
        let welcomeTitle;
        let welcomeBtnTitle;
        let buttonListener;

        if (this.isFromInvite()) {
            welcomeTitle = 'You got a call!';
            welcomeBtnTitle = 'Join!'
            buttonListener = () => this.connectPeer();
        }
        else {
            welcomeTitle = 'Copy link to your peer!';
            welcomeBtnTitle = 'Copy Link!'
            buttonListener = () => this.addPeerLinkToClipboard();
        }

        this.elements.welcomeTitle.classList.remove('fail');
        this.elements.welcomeTitle.classList.remove('loading');
        this.elements.welcomeTitle.setValue(welcomeTitle);
        this.elements.yourId.innerText = `Your ID: ${this.localId}`;
        this.elements.yourId.hidden = false;
        this.elements.btnStart.setValue(welcomeBtnTitle);

        this.elements.btnStart.addEventListener("click", buttonListener);
        this.elements.btnStart.hidden = false;

        this.elements.localVideo.onclick = async () => {
            cameraManager.toggleCamera();
        }
    }

    async addPeerLinkToClipboard() {
        //this.tryFullScreen();
        let url = `${window.location.href.split("?")[0]}?id=${this.localId}`
        navigator.clipboard.writeText(url).catch(logger.error);
        this.elements.btnStart.setValue('Copied!')
    }

    createRemoteVideo() {
        let videoElement = document.createElement('video');
        //video.muted = true;
        videoElement.autoplay = true;
        videoElement.className = 'remoteVideo';

        let videoWrapper = document.createElement('div');
        videoWrapper.className = 'remoteVideoWrapper';

        videoElement.addEventListener('loadedmetadata', () => {
            let className = videoElement.videoWidth < videoElement.videoHeight ? 'portrait' : 'landscape';
            videoWrapper.classList.add(className);
        })


        videoWrapper.appendChild(videoElement);
        this.remoteVideos.push(videoElement);
        this.elements.remoteVideosContainer.appendChild(videoWrapper);
        

        this.updateVideoLayout();

        return { videoWrapper, videoElement } ;
    }

    removeVideo(videoWrapper) {
        videoWrapper.remove();
        this.updateVideoLayout();
    }

    updateVideoLayout() {
        let vidCount = this.elements.remoteVideosContainer.children.length;
        let colCount = Math.ceil(Math.sqrt(vidCount));
        let rowCount = Math.ceil(vidCount / colCount);
        let el =  this.elements.remoteVideosContainer;
        el.style.setProperty('--column-count', colCount);
        el.style.setProperty('--row-count', rowCount);
    }

    initP2pManager() {
        let isHost = !this.isFromInvite()
        this.p2pManager = new P2pManager(isHost, signalServerUrl);
        this.p2pManager.localVideoElement = this.elements.localVideo;
        //this.p2pManager.remoteVideoElement = this.elements.remoteVideo;
        this.p2pManager.on('connectionCreated', connection => {
            logger.info(`connectionCreated ${connection.remote.id}`)
            this.elements.welcome.hidden = true;
            this.elements.videoContainer.hidden = false;
 
            let { videoWrapper, videoElement } = this.createRemoteVideo();

            connection.on('remoteStream', ({ track, stream }) => {
                logger.info(`remoteStream trackId: ${track.id } streamId: ${stream ? stream.id : 'null stream'}`);
                videoElement.srcObject = stream;
            });

            connection.on('connectionStateChange', ({ connectionState }) => {
                logger.info(`connectionStateChange ${connectionState}`)
                switch (connectionState) {
                    case 'disconnected':
                        videoWrapper.classList.add('disconnected');
                        break;
                    case 'closed':
                    case 'failed':
                        this.removeVideo(videoWrapper);
                        break;
                    case 'connected':
                        videoWrapper.classList.remove('disconnected');
                        break;
                }
               
            })

            cameraManager.setCamera();
            // not support in android.. yet
            // this.elements.localVideo.onloadedmetadata = () => {
            //     this.elements.localVideo.requestPictureInPicture().then(logger.info).catch(logger.error);
            // }
        });
        this.p2pManager.onDisconnectSignalingServer = () => {
            //TODo
        }

        cameraManager.on('cameraChange', () => {
            this.setLocalStream(cameraManager.stream);
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
        if (!this.remoteId) {
            return;
        } 

        this.elements.welcomeTitle.setValue('Connecting peer...')
        try {
            let res = await this.p2pManager.connectPeer(this.remoteId);
        }
        catch (ex) {
            logger.error(ex);
        }
        this.tryFullScreen();
    }

    async tryFullScreen() {
        if (!document.fullscreen) {
            return this.elements.main.requestFullscreen().catch(logger.error);
        }
    }

    initCallButtons() {
        this.initBtnEnableVideo();
        this.initBtnEnableMic();
        this.initBtnEnableScreenShare();
        this.initBtnEnableFullScreen();
    }

    initBtnEnableVideo() {
        let btnEnableVideo = this.elements.btnEnableVideo;
        btnEnableVideo.setIcon('videocam');
        btnEnableVideo.addEventListener('click', () => {
            let [track] = cameraManager.stream ? cameraManager.stream.getVideoTracks() : [];
            track.enabled = !track.enabled;
            let icon = track.enabled ? 'videocam' : 'videocam_off';
            btnEnableVideo.setIcon(icon);
        })

    }

    initBtnEnableMic() {
        let btnEnableMic = this.elements.btnEnableMic;
        btnEnableMic.setIcon('mic');
        btnEnableMic.addEventListener('click', () => {
            let [track] = cameraManager.stream ? cameraManager.stream.getAudioTracks() : [];
            track.enabled = !track.enabled;
            let icon = track.enabled ? 'mic' : 'mic_off';
            btnEnableMic.setIcon(icon);
        })
    }

    initBtnEnableScreenShare() {
        if (!isMobile()) {
            let btnEnableScreenShare = this.elements.btnEnableScreenShare;
            btnEnableScreenShare.setIcon('screen_share');
            btnEnableScreenShare.addEventListener('click', async () => {
                if (this.displayStream) {
                    this.displayStream.getTracks().forEach(t => t.stop());
                    this.displayStream = null;
                    this.setLocalStream(cameraManager.stream);
                }
                else {
                    this.displayStream = await navigator.mediaDevices.getDisplayMedia();
                    this.setLocalStream(this.displayStream);
                }

                let icon = this.displayStream ? 'stop_screen_share' : 'screen_share';
                btnEnableScreenShare.setIcon(icon);
            })
        }
        else {
            this.elements.btnEnableScreenShare.hidden = true;
        }
    }


    initBtnEnableFullScreen() {
        let btnEnableFullScreen = this.elements.btnEnableFullScreen;
        btnEnableFullScreen.setIcon('fullscreen');
        btnEnableFullScreen.addEventListener('click', async () => {
            if (document.fullscreen) {
                document.exitFullscreen();
            }
            else {
                await this.tryFullScreen();
            }
        })

        document.addEventListener('fullscreenchange', () => {
            let icon = document.fullscreen ? 'fullscreen_exit' : 'fullscreen';
            btnEnableFullScreen.setIcon(icon);
        })
    }

    setLocalStream(stream) {
        this.p2pManager.setLocalStream(stream);
        this.elements.localVideo.srcObject = stream;
    }
}


defineComponent('main-component', MainComponent, { template, style });