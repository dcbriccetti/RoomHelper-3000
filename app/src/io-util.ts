import {io} from "socket.io-client"

export function newSocket(channel: string) {
    alert(`Connecting to ${channel}`)
    console.log(`Connecting to ${channel}`)
    const protocol = window.location.protocol
    const port = window.location.port || (protocol === 'https:' ? '443' : '80')
    const uri = `${window.location.protocol}//${window.location.hostname}:${port}/${channel}`
    return io(uri)
}
