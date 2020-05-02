import { logger } from './logger.js';

const FacingMode = {
    user: 'user',
    environment: 'environment'
}


class CameraManager {
    constructor() {
        this.facingMode = null;
        this.stream = null;
        this.readyPromise = null;
        this.listeners = {
            cameraChange: []
        }
    }

    async toggleCamera() {
        let hasMultipleCameras = await this.checkIfMultipleCameras();
        if (hasMultipleCameras) {
            let facingMode = this.facingMode === FacingMode.user ? FacingMode.environment : FacingMode.user;
            this.setCamera(facingMode);
        }
    }
 
    async setCamera(facingMode = FacingMode.user) {
        let changed = this.facingMode !== facingMode;
        if (changed) {
            this.facingMode = facingMode;
            if (this.stream) {
                this.stopCamera();
            }

            this.readyPromise = new Promise(async (resolve, reject) => {
                try {
                    let includeAudio = true;//!this.audioTrack
                    let stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facingMode }, audio: includeAudio });
                    this.stream = stream;
                    setTimeout(() => {
                        try {
                            this.listeners.cameraChange.forEach(callback => callback())
                        }
                        catch (ex) {
                            logger.error(ex);
                        }
                    }, 0);
            
                    resolve(this.stream);
                }
                catch (ex) {
                    logger.error(ex);
                    reject(ex);
                }
            });
        }


        return this.readyPromise;
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }

    on(eventName, callback) {
        if (eventName in this.listeners) {
            this.listeners[eventName].push(callback);
        }
        else {
            throw new Error('no such event');
        }
    }

    async checkIfMultipleCameras() {
        let res = false;
        try {
            let devices = await navigator.mediaDevices.enumerateDevices();
            let videoInputs = devices.filter(d => d.kind === "videoinput");
            res = videoInputs.length > 1;
        }
        catch (ex) {
            logger.error(ex);
        }

        return res;
    }
}

let cameraManager = new CameraManager();

export {
    cameraManager,
    FacingMode
}