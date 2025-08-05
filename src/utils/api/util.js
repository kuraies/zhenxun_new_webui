import { setRequestBaseUrl } from '@/utils/axios/util.js'
import { setBaseApiUrl, setPort } from '@/utils/api/index.js'

export function updateRequestUrl(url, port) {
    setPort(port)
    setBaseApiUrl(url)
    setRequestBaseUrl();
}
