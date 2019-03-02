'use strict';

class StationLoc {
    constructor(index, x, y) {
        this.index = index;
        this.x = Math.round(x);
        this.y = y;
    }
}

const sketch = new p5(p => {

    const AISLE_WIDTH = 7;

    p.getStationLocs = function() {
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

        const locs = [];

        for (let r = 0; r < settings.rows; ++r) {
            for (let c = 0; c < settings.columns; ++c) {
                const seatIndex = r * settings.columns + c;
                if (!missingSeatIndexes.has(seatIndex)) {
                    locs.push(new StationLoc(seatIndex, adjustedX(r, c), adjustedY(r)));
                }
            }
        }
        return locs;
    };

    p.stationLocs = [];

    p.setup = function() {
        p.createCanvas(800, 400).parent('canvas-container');
        p.reconfigure();
    };

    p.reconfigure = function() {
        p.stationLocs = p.getStationLocs();
        p.loop();
    };

    function stationWidth() {
        return (p.width - AISLE_WIDTH) / settings.columns;
    }

    function stationHeight() {
        return p.height / settings.rows;
    }

    p.draw = function() {
        const w = stationWidth();
        const h = stationHeight();
        const normalColor   = [168, 196, 219];
        const selectedColor = [230, 230, 230];

        function stationName(index) {
            const rowFrom0 = Math.floor(index / settings.columns);
            const colFrom0 = index % settings.columns;
            return String.fromCharCode('A'.charCodeAt(0) + rowFrom0) + (colFrom0 + 1);
        }

        function drawStation(loc) {

            function drawStatusTags(name, y, xMargin, xPerKey, tagHeight) {
                const tagColors = [[45, 98, 163], [228, 113, 39], [142, 145, 143]];
                settings.statuses.forEach((s, i) => {
                    const key = s[0];
                    const code = s[1];
                    const x = loc.x + xMargin + xPerKey * i;
                    const keyOrder = status.orders[key];
                    if (keyOrder) {
                        const studentOrder = keyOrder[name];
                        if (studentOrder) {
                            p.fill(tagColors[i % tagColors.length]);
                            p.rect(x - 2, loc.y + h - tagHeight - 3, xPerKey, tagHeight);
                            p.fill(0);
                            p.text(code + studentOrder.order, x, y);
                        }
                    }
                });
            }

            p.textFont('Helvetica');
            p.noStroke();
            const station = stations[loc.index];
            p.fill(loc.index === selectedSeatIndex ? selectedColor : normalColor);
            p.rect(loc.x, loc.y, w - 3, h - 3);

            p.fill(0);
            const xMargin = 2;
            p.textSize(10);
            p.textAlign(p.LEFT, p.TOP);
            p.text(stationName(loc.index), loc.x + xMargin, loc.y + 3);

            if (station && station.name) {
                p.fill(station.connected ? 0 : 128);
                p.textAlign(p.RIGHT);
                p.text(station.ip, loc.x + w - xMargin - 2 /* todo why this 2 */, loc.y + 3);
                const parts = station.name.split(', ');
                p.textSize(20);
                p.textAlign(p.CENTER, p.CENTER);
                const name = parts[1];
                if (p.textWidth(name) > w) p.textSize(14);
                p.text(name, loc.x + w / 2, loc.y + h / 3);
                p.textSize(12);
                p.text(parts[0], loc.x + w / 2, loc.y + h / 3 + 20);

                p.textSize(14);
                p.textAlign(p.LEFT, p.BOTTOM);
                const xPerKey = (w - 2 * xMargin) / status.keys.length;
                const tagHeight = 1 / 3 * h;

                const y = loc.y + h - 4;
                const answer = station.answer;
                if (showAnswersInStations && answer) {
                    p.text(answer, loc.x + xMargin, y);
                } else {
                    drawStatusTags(station.name, y, xMargin, xPerKey, tagHeight);
                }
            }
        }

        p.background(255);

        p.stationLocs.forEach(loc => drawStation(loc));

        p.noLoop();
    };

    p.doubleClicked = function () {
        p.stationLocs.forEach(loc => {
        });
    };
 });
