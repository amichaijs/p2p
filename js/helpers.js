window.html = function html(strings, ...values) {
    return String.raw({ raw: strings }, ...values)
}

let nextIdCounter = 0;
let requestId = (prefix= "", suffix ="") => {
    return `${prefix}${nextIdCounter}${suffix}`;
}

let generateRandomId = (numOfParts = 8) => {
    return Array.from(crypto.getRandomValues(new Uint8Array(numOfParts))).map(num => toHexString(num)).join("-");
}

let toHexString = function (num) {
    return num.toString(16).padStart(2,'0');
}

export {
    requestId,
    generateRandomId
}