$(document).ready(() => {
    const socket = io.connect();

    socket.on('seated', msg => {
        const row0 = Number(msg.message.row) - 1;
        const col0 = Number(msg.message.column) - 1;
        const name = msg.message.name;
        console.log(`Received ${msg.ip}, ${name}, ${row0}, ${msg.message.column}`);
        seats[row0 * cols + col0] = name;
    });

    $('form#seat').submit(event => {
        socket.emit('seat', {name: $('#name').val(), row: $('#row').val(), column: $('#column').val()});
        return false;
    });
});
