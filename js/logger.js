const logger = {
    callbacks: [],
    _log(msg, level) {
        if (this.callbacks.length) {
            this.callbacks.forEach(callback => callback(msg, level));
        }
    },
    info(msg) {
        console.info(msg);
        this._log(msg, 'info');
    },
    warn(msg) {
        console.warn(msg);
        this._log(msg, 'warn');
    },
    error(exOrMsg) {
        console.error(exOrMsg)
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