import { MdcComponent, defineComponent } from './mdc-component.js'
import { generateRandomId } from '../helpers.js'
import { P2pManager } from '../connection/p2pManager.js';
import { logger } from '../logger.js';

/*
    - create random "UserId" for each machine. it should persists until browser close.
    - the peer ids from STUN server are temporary and may change. thus each peer need to update on peerId change, using the UserId in metadata

*/

const signalServerUrl = "wss://js-webrtc-server.herokuapp.com"

const ConnectionType = {
    Main: 0,
    Audio: 1,
    Video:2,

}

let template = html`
<div id="main">
    <div id="welcome">
        <h3 id="welcomeTitle"  class="loading" >Just a moment...</h3>
        <mdc-button hidden id="btnStart"></mdc-button>
    </div>
    <log-component id="logComponent"></log-component>
    <div hidden id="videoContainer">
        <video id="localVideo" class="video" autoplay muted></video>
        <video id="remoteVideo" class="video" autoplay></video>
    </div>
</div>`;

let style = html`
<style>
    [hidden] {
        display:none !important;
    }

    #main {
        display:flex;
        flex-flow: column;
        justify-content:center;
        position:absolute;
        top:0;
        right:0;
        bottom:0;
        left:0;
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

    #remoteVideo { 
        width: 100%;
        height: 100%;
        object-fit: cover;
        max-width: 800px;
    }

    .video {
        width:100%;
    }

    #videoContainer {
        display: flex;
        justify-content: center;
        align-items: center;
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
    }

    isFromInvite() {
        return !!this.remoteId;
    }

    async afterRender() {
        this.loadElements();
        logger.onLog(() => this.onLog);
        this.initP2pManager();
        try {
            this.connectSignalingPromise = await this.connectServer();
            this.initWelcome();
        }
        catch(ex) {
            logger.error(ex);
            this.elements.welcomeTitle.classList.remove('loading');
            this.elements.welcomeTitle.classList.add('fail');
            this.elements.welcomeTitle.setValue('Ouw something went wrong.. :( refresh?');
        }
    }

    initWelcome() {
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

        this.elements.welcomeTitle.classList.remove('loading');
        this.elements.welcomeTitle.setValue(welcomeTitle)
        this.elements.btnStart.setValue(welcomeBtnTitle)

        this.elements.btnStart.addEventListener("click", buttonListener);
        this.elements.btnStart.hidden = false;
    }

    async addPeerLinkToClipboard() {
        this.tryFullScreen();
        let url = `${window.location.href.split("?")[0]}?id=${this.localId}`
        navigator.clipboard.writeText(url).catch(logger.error);
        this.elements.btnStart.setValue('Copied!')
    }

    initP2pManager() {
        this.p2pManager = new P2pManager(signalServerUrl);
        this.p2pManager.localVideoElement = this.elements.localVideo;
        this.p2pManager.remoteVideoElement = this.elements.remoteVideo;
        this.p2pManager.onNewConnection = () => {
            this.elements.welcome.hidden = true;
            this.elements.videoContainer.hidden = false;
            // not support in android.. yet
            // this.elements.localVideo.onloadedmetadata = () => {
            //     this.elements.localVideo.requestPictureInPicture().then(logger.info).catch(logger.error);
            // }
        };
    }

    onLog(msg, level) {
        if (level == 'error') {
            this.elements.logComponent.logError(msg);
        }
        else {
            this.elements.logComponent.logInfo(msg);
        }     
    }

    async answerCall() { 
        await this.connectSignalingPromise;
        await this.connectPeer();
    }

    async connectServer() {
        let localId = await this.p2pManager.connectSignalingServer();
        this.localId = localId;
        logger.info(`opened: your id ${localId}`)
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