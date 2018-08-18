$(document).ready(() => {
    const socket = io.connect();

    $('form#seat').submit(event => {
        socket.emit('seat', {name: $('#name').val(), row: $('#row').val(), column: $('#column').val()});
        return false;
    });
});
