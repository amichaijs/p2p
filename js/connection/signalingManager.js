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
            this.addPromise('newId', { promise: this._localIdPromise, resolve, reject, expectedResultType: MessageType.NewUserId });
        });


        return new Promise(function(resolve, reject) {
            let ws = new WebSocket(this.url);
            this.ws = ws;

            ws.onopen = function() {
                resolve(ws);
            };
            ws.onerror = function(err) {
                reject(err);
            };

            ws.onmessage = message => this.onMessage(message);
        });
    }

    onMessage(message) {
        let error = null;
        let promiseKey = null;
        if (!message || !message.type) {
            error = 'Received Invalid message';
        }
        else if (message.type === MessageType.NewUserId) {
            this.localId = message.userId;
            promiseKey = 'newId';
        }
        else if (!message.from) {
            error =  'No "from" property in message'
        }
        else {
            promiseKey = message.to;
        }

        let request = promiseKey ? this.requests.get(promiseKey) : null;
        if (request) {
            if (message.errorCode) {
                request.reject(message);
            }
            else if (message.type !== request.expectedResultType){
                console.warn(`got unexpected message from ${message.from} of type ${message.type}, expected result type: ${request.expectedResultType}`)
            }
            else {
                request.resolve(message);
            }

            this.requests.delete(promiseKey);
        }
    }
    
    addPromise(key, { promise, resolve, reject, expectedResultType }) {
        this.requests.set(to, promise, resolve, reject, expectedResultType);
    }

    sendAsync = function({ type, to, data, expectedResultType: expectedResultType }) {
        let promise = new Promise((resolve, reject) => {
            this.addPromise(to, { promise, resolve, reject, expectedResultType: expectedResultType});
            this.ws.send({ type, to, data});
        });
    }
    
    async sendOffer(peerId, offer) {
        return this.sendAsync({ type: MessageType.Offer, to: peerId, data: offer, resultType: MessageType.Answer });
    }

    async sendAnswer(peerId, answer) {
        return this.sendAsync({ type: MessageType.Answer, to: peerId, data: answer });
    }

    async onReceivedOffer(peerId, incomingOffer) {
        throw 'override me';
    }

    async getLocalId() {
        //TODO: await new localid, since u cant get id instantly on new WS
        if (this.ws.readyState === WebSocket.OPEN && this.localId) {
            
        }
    }
}

export {
    SignalingManager,
    MessageType,
    ErrorCodes,
}
