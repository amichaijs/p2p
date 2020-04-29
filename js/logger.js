let getTimeString = function() {
    let now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();
    let milliseconds = now .getMilliseconds();
    return `${hours}:${minutes}:${seconds}:${milliseconds}`;
}

let callbacks = [];

class Logger {
    constructor(name) {
        this.name = name || '';
        this._bindThis();
    }

    _log(msg, level, time) {
        if (callbacks.length) {
            callbacks.forEach(callback => callback(msg, level, time));
        }
    }
    info(msg) {
        let time = getTimeString();
        console.info(time, this.name, msg);
        this._log(msg, 'info', time);
    }
    warn(msg) {
        let time = getTimeString();
        console.warn(time, this.name, msg);
        this._log(msg, 'warn');
    }
    error(exOrMsg) {
        let time = getTimeString();
        console.error(time, this.name, exOrMsg);
        let msg = exOrMsg instanceof Error ? exOrMsg.stack : exOrMsg;
        this._log(msg, 'error');
    }

    onLog(callback) {
        callbacks.push(callback);
    }

    _bindThis() {
        this.info = this.info.bind(this);
        this.warn = this.warn.bind(this);
        this.error = this.error.bind(this);
    }
}

const logger = new Logger();


export {
    logger,
    Logger
}