'use strict';

new p5(p => {
    p.setup = function() {
        p.createCanvas(800, 400).parent('canvas');
    };

    p.draw = function() {
        const aisleWidth = 7;
        const w = (p.width - aisleWidth) / settings.columns;
        const h = p.height / settings.rows;
        const frontView = $('#front-view').is(':checked');
        const normalColor   = [168, 196, 219];
        const selectedColor = [200, 159, 178];
        const doneColor     = [99,  255, 139];
        const needHelpColor = [255, 146,  69];

        function stationName(index) {
            const rowFrom0 = Math.floor(index / settings.columns);
            const colFrom0 = index % settings.columns;
            return String.fromCharCode('A'.charCodeAt(0) + rowFrom0) + (colFrom0 + 1);
        }

        function drawStation(startX, startY, seatIndex) {
            p.textFont('Helvetica');
            p.noStroke();
            const station = stations[seatIndex];
            if (seatIndex === selectedSeatIndex)
                p.fill(selectedColor);
            else if (station && station.needHelp)
                p.fill(needHelpColor);
            else if (station && station.done)
                p.fill(doneColor);
            else
                p.fill(normalColor);

            p.rect(startX, startY, w - 3, h - 3);

            p.fill(0);
            const xMargin = 2;
            p.textSize(10);
            p.textAlign(p.LEFT, p.TOP);
            p.text(stationName(seatIndex), startX + xMargin, startY + 3);

            if (station && station.name) {
                p.textAlign(p.RIGHT);
                p.text(station.ip, startX + w - xMargin - 2 /* todo why this 2 */, startY + 3);
                const parts = station.name.split(', ');
                p.textSize(20);
                p.textAlign(p.CENTER, p.CENTER);
                const name = station.nickname || parts[1];
                if (p.textWidth(name) > w) p.textSize(14);
                p.text(name, startX + w / 2, startY + h / 3);
                p.textSize(12);
                p.text(parts[0], startX + w / 2, startY + h / 3 + 20);

                p.textSize(14);
                p.textAlign(p.LEFT, p.BOTTOM);
                const xPerKey = (w - 2 * xMargin) / status.keys.length;

                status.keys.forEach((key, i) => {
                    const code = status.shortCodes[i];
                    const x = startX + xMargin + xPerKey * i;
                    const keyOrder = status.orders[key];
                    if (keyOrder) {
                        const studentOrder = keyOrder[station.name];
                        if (studentOrder) {
                            p.text(code + studentOrder.order, x, startY + h - 4);
                        }
                    }
                });
            }
        }

        p.background(255);

        const missingSeatIndexes = new Set(settings.missingSeatIndexes);

        for (let r = 0; r < settings.rows; ++r) {
            for (let c = 0; c < settings.columns; ++c) {
                const seatIndex = r * settings.columns + c;
                if (!missingSeatIndexes.has(seatIndex)) {
                    const ar = frontView ? settings.rows - 1 - r : r;
                    const ac = frontView ? settings.columns - 1 - c : c;
                    const aisleAdj = frontView ?
                        ac > settings.columns - 1 - 1 - settings.aisleAfterColumn ? aisleWidth : 0 :
                        ac > settings.aisleAfterColumn ? aisleWidth : 0;
                    drawStation(ac * w + aisleAdj, ar * h, seatIndex);
                }
            }
        }

        p.noLoop();
    };
});
