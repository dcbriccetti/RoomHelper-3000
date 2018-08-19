$(document).ready(() => {
    const socket = io.connect();

    function name() {return $('#name').val();}
    function row() {return $('#row').val();}
    function column() {return $('#column').val();}

    $('form#seat').submit(event => {
        if (name().length > 0 && row().length > 0 && column().length > 0) {
            socket.emit('seat', {name: name(), row: row(), column: column()});
            $('#status').show();
        }
        return false;
    });

    function updateStatus() {
        socket.emit('set_status', {name: name(), row: row(), column: column(),
            needHelp: $('#need-help').is(':checked'),
            done: $('#done').is(':checked')});
        return true;
    }

    ['need-help', 'done'].forEach(id => {$(`#${id}`).click(updateStatus);});
});
