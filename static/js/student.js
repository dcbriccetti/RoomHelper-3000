$(() => {
    const status = new Status(null);
    const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port + '/student');

    function nickname()     {return $('#nickname').val();}
    function name()         {return $('#name').val();}
    function row()          {return $('#row').val();}
    function column()       {return $('#column').val();}
    function getSeatIndex() {return (Number(row()) - 1) * settings.columns + Number(column()) - 1;}

    socket.on('set_names', msg => {
        $('#name option:gt(0)').remove();
        const sel = $('#name');
        msg.names.split('\n').forEach(name =>
            sel.append(`<option value="${name}">${name}</option>`));
    });

    $('form#seat').submit(() => {
        if (name().length > 0 && row().length > 0 && column().length > 0) {
            socket.emit('seat', {nickname: nickname(), name: name(), seatIndex: getSeatIndex()});
            $('#status').show();
        }
        return false;
    });

    function updateStatus() {
        const args = {name: name(), seatIndex: getSeatIndex()};
        status.keys.forEach((key) => args[key] = $('#' + key).is(':checked'));
        socket.emit('set_status', args);
        return true;
    }

    status.keys.forEach(id => {$(`#${id}`).click(updateStatus);});
});
