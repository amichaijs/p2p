let getTimeString = function() {
    let now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();
    let milliseconds = now .getMilliseconds();
    return `${hours}:${minutes}:${seconds}:${milliseconds}`;
}

const logger = {
    callbacks: [],
    _log(msg, level, time) {
        if (this.callbacks.length) {
            this.callbacks.forEach(callback => callback(msg, level, time));
        }
    },
    info(msg) {
        let time = getTimeString();
        console.info(time, msg);
        this._log(msg, 'info', time);
    },
    warn(msg) {
        let time = getTimeString();
        console.warn(time, msg);
        this._log(msg, 'warn');
    },
    error(exOrMsg) {
        let time = getTimeString();
        console.error(time, exOrMsg);
        let msg = exOrMsg instanceof Error ? exOrMsg.stack : exOrMsg;
        this._log(msg, 'error');
    },

    onLog(callback) {
        this.callbacks.push(callback);
    }
}



logger.info = logger.info.bind(logger);
logger.warn = logger.warn.bind(logger);
logger.error = logger.error.bind(logger);

export {
    logger
}