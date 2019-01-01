class Messenger {
    constructor(socket, nameFn, prefix, controlFlood) {
        const messageMessage = prefix + '_msg';
        const clearMessage = 'clear_' + prefix;
        const entrySelector = `#${prefix}-msg`;
        const contentsSelector = `#${prefix}-log`;
        socket.on(messageMessage, (msg) => $(contentsSelector).prepend(msg));
        socket.on(clearMessage, () => $(contentsSelector).empty());

        const entryField = $(entrySelector);
        let chatAfterTime = 0;
        entryField.keypress(e => {
            const msgLen = entryField.val().length;
            if (e.which === 13 && msgLen > 0 && msgLen < settings.chatMessageMaxLen &&
                new Date().getTime() > chatAfterTime) {
                socket.emit(messageMessage, nameFn(), entryField.val());
                entryField.val('');
                if (controlFlood)
                    chatAfterTime = new Date().getTime() + settings.chatDelayMs;
            }
        });
    }
}

class Chat extends Messenger {
    constructor(socket, nameFn, controlFlood) {
        super(socket, nameFn, 'chat', controlFlood);
    }
}

class TeacherChat extends Chat {
    constructor(socket, nameFn) {
        super(socket, nameFn, false);
    }
}

class Shares extends Messenger {
    constructor(socket, nameFn, controlFlood) {
        super(socket, nameFn, 'shares', controlFlood);
    }
}
