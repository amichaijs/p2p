window.html = function html(strings, ...values) {
    return String.raw({ raw: strings }, ...values)
}

let nextIdCounter = 0;
let requestId = (prefix= "", suffix ="") => {
    return `${prefix}${nextIdCounter}${suffix}`;
}

export {
    requestId
}