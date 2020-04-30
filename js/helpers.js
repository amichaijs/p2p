import { logger } from "./logger.js";

window.html = function html(strings, ...values) {
    return String.raw({ raw: strings }, ...values)
}

let nextIdCounter = 0;
let requestId = (prefix = "", suffix = "") => {
    return `${prefix}${nextIdCounter}${suffix}`;
}

let generateRandomId = (numOfParts = 8) => {
    return Array.from(crypto.getRandomValues(new Uint8Array(numOfParts))).map(num => toHexString(num)).join("-");
}

let toHexString = function (num) {
    return num.toString(16).padStart(2, '0');
}

let isMobile = function() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

class EventManager {
    /**@param {string[]} eventNames */
    constructor(...eventNames) {
        if (!eventNames) {
            throw `Event Map wasn't given event names`
        }
        /**@type Map<String, Set<Function>> */
        this.events = new Map();
        eventNames.forEach(event => {
            this.events.set(event, new Set());
        })
    }

    on(eventName, callback) {
        let res = null;
        let callbacksSet = this.events.get(eventName);
        if (callbacksSet) {
            res = callbacksSet.add(callback);
        }
        else {
            throw `Event doesn't exist, cannot add listener`
        }

        return res;
    }

    off(/**@type string */ eventName, /**@type function */ callback) {
        let res = false;
        let callbacksSet = this.events.get(eventName);
        if (callbacksSet) {
            res = callbacksSet.delete(callback);
        }
        else {
            throw `Event doesn't exist, cannot remove listener`
        }

        return res;
    }

    dispatchEvent(eventName, data) {
        let callbacksSet = this.events.get(eventName);
        logger.info(`dispatching event ${eventName}, data: ${JSON.stringify(data)}, callbacks: ${callbacksSet.size}`);
        if (callbacksSet) {
            setTimeout(() => {
                callbacksSet.forEach(callback => {
                    try {
                        logger.info(`dispatching event ${eventName}, data: ${JSON.stringify(data)}`);
                        callback(data);
                    }
                    catch (ex) {
                        console.error(ex);
                    }
                });
            }, 0);
        }
        else {
            throw `Event doesn't exist, cannot dispatch callbacks`
        }
    }
}

class Deferred extends Promise {
    constructor(executor) {
        let _resolve, _reject;
        let wrapperFn = (resolve, reject) => {
            executor && executor(resolve, reject);
            _resolve = resolve;
            _reject = reject;
        }

        super(wrapperFn);

        this.resolve = _resolve;
        this.reject = _reject;
    }
}

export {
    requestId,
    generateRandomId,
    isMobile,
    Deferred,
    EventManager
}