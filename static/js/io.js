const rows = 4;
const cols = 9;
const seats = [
    'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', '', 
    'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 
    'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9',
    'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', '', 
];
const missingSeatIndexes = new Set([8, 35]);
const aisleAfterColumn = 3;

$(document).ready(() => {
    const socket = io.connect();

    socket.on('connect', () => {
        socket.emit('my_event', {data: 'I\'m connected!'});
    });

    socket.on('my_response', msg => {
        console.log('Received ' + msg.data);
    });

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
