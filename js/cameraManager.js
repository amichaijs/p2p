import { logger } from './logger.js';

const FacingMode = {
    user: 'user',
    environment: 'environment'
}


class CameraManager {
    constructor() {
        this.facingMode =  FacingMode.user;
        this.stream = null;
        this.readyPromise = null;
        this.listeners = {
            cameraChange: []
        }
    }

    async toggleCamera() {
        let facingMode = this.facingMode === FacingMode.user ? FacingMode.environment : FacingMode.user;
        this.setCamera(facingMode);
    }
 
    async setCamera(facingMode = FacingMode.user) {
        let changed = !this.stream || this.facingMode !== facingMode
        if (changed) {
            this.readyPromise = new Promise(async (resolve, reject) => {
                try {
                    let includeAudio = !this.audioTrack
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

    on(eventName, callback) {
        if (eventName in this.listeners) {
            this.listeners[eventName].push(callback);
        }
        else {
            throw new Error('no such event');
        }
    }
}

let cameraManager = new CameraManager();

export {
    cameraManager,
    FacingMode
}