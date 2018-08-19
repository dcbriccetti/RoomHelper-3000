$(document).ready(() => {
    const COLS = 9;
    const socket = io.connect();

    function name() {return $('#name').val();}
    function row() {return $('#row').val();}
    function column() {return $('#column').val();}
    function getSeatIndex() {return (Number(row()) - 1) * COLS + Number(column()) - 1;}

    $('form#seat').submit(event => {
        if (name().length > 0 && row().length > 0 && column().length > 0) {
            socket.emit('seat', {name: name(), seatIndex: getSeatIndex()});
            $('#status').show();
        }
        return false;
    });

    function updateStatus() {
        socket.emit('set_status', {name: name(), seatIndex: getSeatIndex(),
            needHelp: $('#need-help').is(':checked'),
            done: $('#done').is(':checked')});
        return true;
    }

    ['need-help', 'done'].forEach(id => {$(`#${id}`).click(updateStatus);});
});
