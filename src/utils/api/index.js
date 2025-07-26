import { setRequestBaseUrl } from '@/utils/axios/index.js'

let baseApiUrl = `${window.location.protocol}//${window.location.hostname}`
let baseHost = `${window.location.hostname}:${window.location.port}`


function getBaseApiUrl() {
    return localStorage.getItem("url") || baseApiUrl || "localhost";
}

export const getBaseUrl = () => {
    return getBaseApiUrl() + ":" + getPort()
}
export const getPort = () => {
    return localStorage.getItem("port") || window.location.port || "8080"
}

const setBaseApiUrl = (baseUrl) => {
    if(baseUrl) {
            baseApiUrl = baseUrl;
            localStorage.setItem("url", baseUrl);
    }
}
const setPort = (port) => {
    if(port) {
            localStorage.setItem("port", port);
    }
}

export function setUrl(url, port) {
    setPort(port)
    setBaseApiUrl(url)
    setRequestBaseUrl();
}


export const getHost = () => {
    return getBaseUrl().replace(/^https?:\/\//, "");
}