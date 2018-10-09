class Messenger {
    constructor(socket, nameFn, messageMessage, clearMessage, entrySelector, controlFlood) {
        socket.on(messageMessage, this.addMessage);
        socket.on(clearMessage, this.clear);

        const entryField = $(entrySelector);
        let chatAfterTime = 0;
        entryField.keypress(e => {
            if (e.which === 13 && entryField.val().length > 0 && new Date().getTime() > chatAfterTime) {
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
        super(socket, nameFn, 'chat_msg', 'clear_chat', '#chat-msg', controlFlood);
    }

    addMessage(msg) {
        $('#chat-log').prepend(msg);
    }

    clear() {
        return $('#chat-log').empty();
    }
}

class TeacherChat extends Chat {
    constructor(socket, nameFn) {
        super(socket, nameFn, false);
    }
}

class Shares extends Messenger {
    constructor(socket, nameFn, controlFlood) {
        super(socket, nameFn, 'shares_msg', 'clear_shares', '#shares-msg', controlFlood);
    }

    addMessage(msg) {
        $('#shares-log').prepend(msg);
    }

    clear() {
        return $('#shares-log').empty();
    }
}
