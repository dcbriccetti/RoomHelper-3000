'use strict';

const sketch = new p5(p => {

    p.buildStationDrawingLocations = function() {
        const missingSeatIndexes = new Set(settings.missingSeatIndexes);
        const frontView = $('#front-view').is(':checked');
        const aisleWidth = 7;
        const w = (p.width - aisleWidth) / settings.columns;
        const h = p.height / settings.rows;

        function adjustedX(r, c) {
            const view_adjusted_col = frontView ? settings.columns - 1 - c : c;
            const aisleXAdjustment = !settings.aisleAfterColumn ? 0 :
                frontView ?
                    view_adjusted_col > settings.columns - 1 - 1 - settings.aisleAfterColumn ? aisleWidth : 0 :
                    view_adjusted_col > settings.aisleAfterColumn ? aisleWidth : 0;

            return view_adjusted_col * w + aisleXAdjustment;
        }

        function adjustedY(r) {return (frontView ? settings.rows - 1 - r : r) * h;}

        const stationDrawLocations = [];

        for (let r = 0; r < settings.rows; ++r) {
            for (let c = 0; c < settings.columns; ++c) {
                const seatIndex = r * settings.columns + c;
                if (!missingSeatIndexes.has(seatIndex)) {
                    stationDrawLocations.push([adjustedX(r, c), adjustedY(r), seatIndex]);
                }
            }
        }
        return stationDrawLocations;
    };

    p.stationDrawLocations = [];

    p.setup = function() {
        p.createCanvas(800, 400).parent('canvas');
        p.reconfigure();
    };

    p.reconfigure = function() {
        p.stationDrawLocations = p.buildStationDrawingLocations();
        p.loop();
    };

    p.draw = function() {
        const aisleWidth = 7;
        const w = (p.width - aisleWidth) / settings.columns;
        const h = p.height / settings.rows;
        const normalColor   = [168, 196, 219];
        const selectedColor = [230, 230, 230];

        function stationName(index) {
            const rowFrom0 = Math.floor(index / settings.columns);
            const colFrom0 = index % settings.columns;
            return String.fromCharCode('A'.charCodeAt(0) + rowFrom0) + (colFrom0 + 1);
        }

        function drawStation(startX, startY, seatIndex) {

            function drawStatusTags(name, y, xMargin, xPerKey, tagHeight) {
                const tagColors = [[45, 98, 163], [228, 113, 39], [142, 145, 143]];
                settings.statuses.forEach((s, i) => {
                    const key = s[0];
                    const code = s[1];
                    const x = startX + xMargin + xPerKey * i;
                    const keyOrder = status.orders[key];
                    if (keyOrder) {
                        const studentOrder = keyOrder[name];
                        if (studentOrder) {
                            p.fill(tagColors[i % tagColors.length]);
                            p.rect(x - 2, startY + h - tagHeight - 3, xPerKey, tagHeight);
                            p.fill(0);
                            p.text(code + studentOrder.order, x, y);
                        }
                    }
                });
            }

            p.textFont('Helvetica');
            p.noStroke();
            const station = stations[seatIndex];
            p.fill(seatIndex === selectedSeatIndex ? selectedColor : normalColor);
            p.rect(startX, startY, w - 3, h - 3);

            p.fill(0);
            const xMargin = 2;
            p.textSize(10);
            p.textAlign(p.LEFT, p.TOP);
            p.text(stationName(seatIndex), startX + xMargin, startY + 3);

            if (station && station.name) {
                p.fill(station.connected ? 0 : 128);
                p.textAlign(p.RIGHT);
                p.text(station.ip, startX + w - xMargin - 2 /* todo why this 2 */, startY + 3);
                const parts = station.name.split(', ');
                p.textSize(20);
                p.textAlign(p.CENTER, p.CENTER);
                const name = parts[1];
                if (p.textWidth(name) > w) p.textSize(14);
                p.text(name, startX + w / 2, startY + h / 3);
                p.textSize(12);
                p.text(parts[0], startX + w / 2, startY + h / 3 + 20);

                p.textSize(14);
                p.textAlign(p.LEFT, p.BOTTOM);
                const xPerKey = (w - 2 * xMargin) / status.keys.length;
                const tagHeight = 1 / 3 * h;

                const y = startY + h - 4;
                const answer = station.answer;
                if (showAnswersInStations && answer) {
                    p.text(answer, startX + xMargin, y);
                } else {
                    drawStatusTags(station.name, y, xMargin, xPerKey, tagHeight);
                }
            }
        }

        p.background(255);

        p.stationDrawLocations.forEach(loc => drawStation(loc[0], loc[1], loc[2]));

        p.noLoop();
    };

    p.mouseClicked = function() {
       p.stationDrawLocations.forEach(loc => {
           // TODO: console.log(loc, p.mouseX, p.mouseY);
       });
    };
 });
