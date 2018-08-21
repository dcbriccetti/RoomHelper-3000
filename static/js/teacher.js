const stations = new Array(settings.rows * settings.columns);
let selectedSeatIndex = null;

$(() => {
    const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port + '/teacher');

    socket.on('seated', msg => {
        function clearNameElsewhere(newSeatIndex, clearName) {
            stations.forEach((station, i) => {
                if (i !== newSeatIndex && station && station.name === clearName) {
                    station.ip = station.nickname = station.name = station.done = station.needHelp = null;
                }
            });
        }

        clearNameElsewhere(msg.seatIndex, msg.station.name);
        stations[msg.seatIndex] = msg.station;
    });

    socket.on('clear_station', seatIndex => {stations[seatIndex] = null;});

    socket.on('status_set', msg => {
        const station = stations[msg.seatIndex];
        station.done = msg.station.done;
        const haveAnswerChange = station.haveAnswer !== msg.station.haveAnswer;
        station.haveAnswer = msg.station.haveAnswer;
        station.needHelp = msg.station.needHelp;
        if (haveAnswerChange) {
            const numHave = stations.filter(s => s.haveAnswer).length;
            $('#choose-with-answer').text(`${numHave} with Answer`)
        }
    });

    $('#set-names').click(event => {
        socket.emit('set_names', {names: $('#names').val(), assignSeats: $('#assign-seats').is(':checked')});
    });

    $('#random-set').click(event => {
        socket.emit('random_set', Number($('#random-set-number').val()));
    });

    function requestRandomCall(any) {
        socket.emit('random_call', any, (i) => selectedSeatIndex = i === -1 ? null : i);
    }

    $('#choose')            .click(event => {requestRandomCall(true);});
    $('#choose-with-answer').click(event => {requestRandomCall(false);});
    $('#choose-reset')      .click(event => {selectedSeatIndex = null;});
});
