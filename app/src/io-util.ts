// todo get following import to work. error: Uncaught TypeError: The specifier “socket.ioUtil-client” was a bare specifier, but was not remapped to anything. Relative module specifiers must start with “./”, “../” or “/”.
// import {io, Socket} from "socket.io-client"

declare const io

export function newSocket(channel: string) {
    const protocol = window.location.protocol
    const port = window.location.port || (protocol === 'https:' ? '443' : '80')
    const uri = `${window.location.protocol}//${window.location.hostname}:${port}/${channel}`
    return io(uri)
}
