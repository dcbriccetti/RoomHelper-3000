class Chat {
    constructor(socket, nameFn) {
        socket.on('chat_msg', msg => {$('#chat-log').prepend(msg);});
        socket.on('clear_chat', () => $('#chat-log').empty());

        const cm = $('#chat-msg');
        let chatAfterTime = 0;
        cm.keypress(e => {
            if (e.which === 13 && cm.val().length > 0 && new Date().getTime() > chatAfterTime) {
                socket.emit('chat_msg', nameFn(), cm.val());
                cm.val('');
                if (this.enforceFloodControl())
                    chatAfterTime = new Date().getTime() + settings.chatDelayMs;
            }
        });


    }

    enforceFloodControl() { return true; }
}

class TeacherChat extends Chat {
    constructor(socket, nameFn) {
        super(socket, nameFn);
    }

    enforceFloodControl() { return false; }
}
