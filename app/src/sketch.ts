import {Status} from "./status"

declare const p5;

class StationLoc {
    constructor(private index: number, private x: number, private y: number) {
        this.x = Math.round(x);
    }
}

export class Sketch {
    private appStatus: Status
    private settings: any
    private stations: any
    private p: any
    private selectedSeatIndex: number | null
    private showAnswersInStations: boolean

    constructor(appStatus, settings, stations) {
        this.appStatus = appStatus
        this.settings = settings
        this.stations = stations
        this.selectedSeatIndex = null
        this.showAnswersInStations = false
    }

    run() {
        const objThis = this;
        new p5(p => {
            objThis.p = p
            const settings = objThis.settings
            const AISLE_WIDTH = 7;

            function getStationLocs() {
                const missingSeatIndexes = new Set(objThis.settings.missingSeatIndexes);
                const frontView = $('#front-view').is(':checked');
                const w = (p.width - AISLE_WIDTH) / objThis.settings.columns;
                const h = p.height / settings.rows;

                function adjustedX(r, c) {
                    const view_adjusted_col = frontView ? settings.columns - 1 - c : c;
                    const aisleXAdjustment = !settings.aisleAfterColumn ? 0 :
                        frontView ?
                            view_adjusted_col > settings.columns - 1 - 1 - settings.aisleAfterColumn ? AISLE_WIDTH : 0 :
                            view_adjusted_col > settings.aisleAfterColumn ? AISLE_WIDTH : 0;

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
            }

            let stationLocs = [];

            p.setup = function() {
                p.createCanvas(800, 400).parent('canvas-container');
                p.reconfigure();
            };

            p.reconfigure = function() {
                stationLocs = getStationLocs();
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
                const selectedColor = [230, 230, 230];
                const pollAnswerSubmittedColor = [200, 230, 200];

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
                            const keyOrder = objThis.appStatus.orders[key];
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
                    const station = objThis.stations[loc.index];
                    p.fill(loc.index === objThis.selectedSeatIndex ?
                        selectedColor : station.answer ?
                            pollAnswerSubmittedColor : 'warn' in station ?
                                settings.warningColor : settings.normalColor);
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
                        const parts = station.name.split(/,\s*/);
                        p.textSize(20);
                        p.textAlign(p.CENTER, p.CENTER);
                        const name = parts[1];
                        if (p.textWidth(name) > w) p.textSize(14);
                        p.text(name, loc.x + w / 2, loc.y + h / 3);
                        p.textSize(12);
                        p.text(parts[0], loc.x + w / 2, loc.y + h / 3 + 20);

                        p.textSize(14);
                        p.textAlign(p.LEFT, p.BOTTOM);
                        const xPerKey = (w - 2 * xMargin) / objThis.appStatus.keys.length;
                        const tagHeight = 1 / 3 * h;

                        const y = loc.y + h - 4;
                        const answer = station.answer;
                        if (objThis.showAnswersInStations && answer) {
                            p.text(answer, loc.x + xMargin, y);
                        } else {
                            drawStatusTags(station.name, y, xMargin, xPerKey, tagHeight);
                        }
                    }
                }

                p.background(255);

                stationLocs.forEach(loc => drawStation(loc));

                p.noLoop();
            };

            p.doubleClicked = function () {
                const w = stationWidth();
                const h = stationHeight();
                const x = p.mouseX;
                const y = p.mouseY;

                stationLocs.forEach(loc => {
                    if (x >= loc.x && y >= loc.y && x <= loc.x + w && y <= loc.y + h) {
                        p.doubleClickListeners.forEach(l => l(loc.index));
                    }
                });
            };

            p.doubleClickListeners = [];
         });
    }

    reconfigure() {
        this.p.reconfigure()
    }

    setSelectedSeatIndex(selectedSeatIndex: number | null) {
        this.selectedSeatIndex = selectedSeatIndex
        this.p.loop();
    }

    loop() {
        this.p.loop()
    }

    setShowAnswersInStations(show: boolean) {
        this.showAnswersInStations = show
    }

    addDoubleClickListener(listener: (index: number) => void) {
        this.p.doubleClickListeners.push(listener)
    }
}

