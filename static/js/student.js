'use strict';

$(() => {
    const status = new Status();
    const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port + '/student');

    let submittedName, submittedNickname;
    function nickname()     {return $('#nickname').val();}
    function name()         {return $('#name').val();}
    function row()          {return $('#row').val();}
    function column()       {return $('#column').val();}
    function firstLast()    {
        const parts = submittedName.split(', ');
        return (submittedNickname || parts[1]) + ' ' + parts[0];
    }
    function getSeatIndex() {return (Number(row()) - 1) * settings.columns + Number(column()) - 1;}

    socket.on('set_names', msg => {
        $('#name option:gt(0)').remove();
        const sel = $('#name');
        msg.names.split('\n').forEach(name =>
            sel.append(`<option value="${name}">${name}</option>`));
    });

    if (settings.chatEnabled) $('#chat').show();
    socket.on('chat_msg', msg => {$('#chat-log').prepend(msg);});
    socket.on('enable_chat', enabled => {
        const c = $('#chat');
        if (enabled) c.show(); else c.hide();
    });


    const cm = $('#chat-msg');
    cm.keypress(e => {
        if (e.which === 13) {
            socket.emit('chat_msg', firstLast() + ': ' + cm.val() + '\n');
            cm.val('');
        }
    });

    $('form#seat').submit(() => {
        if (name().length > 0 && row().length > 0 && column().length > 0) {
            submittedName = name();
            submittedNickname = nickname();
            socket.emit('seat', {nickname: nickname(), name: name(), seatIndex: getSeatIndex()});
            $('#status').show();
        }
        return false;
    });

    function updateStatus() {
        const args = {seatIndex: getSeatIndex()};
        status.keys.forEach((key) => args[key] = $('#' + key).is(':checked'));
        socket.emit('set_status', args);
        return true;
    }

    status.keys.forEach(id => {$(`#${id}`).click(updateStatus);});
});
