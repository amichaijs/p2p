import { logger } from '../logger.js'

let MessageType = {
    NewUserId: 1,
    Offer: 2,
    InComingOffer: 3,
    Answer: 4,
    AnswerBack: 5
}

let ErrorCodes = {
    EmptyMessage: 1,
    InvalidType: 2,
    InvalidData: 3,
    PeerNotFound: 4
}

class SignalingManager {
    constructor(url) {
        this.url = url;
        this.requests = new Map();
        this.ws = null;
        this.localId = null;
    }

    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return this.ws;
        }
        else {
            return this._connect();
        }
    }

    _connect() {
        this._localIdPromise = new Promise((resolve, reject) => {
            this.addPromise('newId', { resolve, reject, expectedResultType: MessageType.NewUserId });
        });

        return new Promise((resolve, reject) => {
            let ws = new WebSocket(this.url);
            this.ws = ws;

            ws.onopen = function() {
                resolve(ws);
            };
            ws.onerror = function(err) {
                reject(err);
            };

            ws.onmessage = ev => this.onMessage(ev);
        });
    }

    onMessage(ev) {
        let message = null;
        try {
            message = ev.data ? JSON.parse(ev.data) : null;
        }
        catch (ex) {
            logger.error(ex);
        }

        let error = null;
        let promiseKey = null;
        if (!message) {
            error = 'Received Empty message';
        }
        else if(message.errorCode) {
            error = `error from ws: ${message.errorCode}`;
        }
        else if (!message || !message.type) {
            error = 'Received Invalid message';
        }
        else if (message.type === MessageType.NewUserId) {
            this.localId = message.data;
            promiseKey = 'newId';
        }
        else if (message.from && message.type == MessageType.Offer) {
            this.onReceivedOffer(message.from, message.data);
        }
        else if (message.from && message.type == MessageType.Answer) {
            promiseKey = message.from;
        }
        else {
            promiseKey = message.to;
        }

        let request = promiseKey ? this.requests.get(promiseKey) : null;
        if (request) {
            if (error) {
                request.reject({ message, error });
            }
            else if (message.type !== request.expectedResultType){
                console.warn(`got unexpected message from ${message.from} of type ${message.type}, expected result type: ${request.expectedResultType}`)
            }
            else {
                request.resolve(message.data);
            }

            this.requests.delete(promiseKey);
        }
    }
    
    addPromise(key, promiseDesc) {
        this.requests.set(key, promiseDesc);
    }

    sendAsync = function({ type, to, data, expectedResultType: expectedResultType }) {
        let promise = new Promise((resolve, reject) => {
            this.addPromise(to, { resolve, reject, expectedResultType: expectedResultType});
            this.ws.send(JSON.stringify({ type, to, data}));
        });

        return promise;
    }
    
    async sendOffer(peerId, offer) {
        return this.sendAsync({ type: MessageType.Offer, to: peerId, data: offer, expectedResultType: MessageType.Answer });
    }

    async sendAnswer(peerId, answer) {
        return this.sendAsync({ type: MessageType.Answer, to: peerId, data: answer });
    }

    async onReceivedOffer(peerId, incomingOffer) {
        throw('override me');
    }

    async getLocalId() {
        await this._localIdPromise;
        return this.localId;
    }
}

export {
    SignalingManager,
    MessageType,
    ErrorCodes,
}
