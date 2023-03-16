import {Status} from "./status.js"
import {qi} from "./dom-util.js"

declare const p5;

class StationLoc {
    constructor(public index: number, public x: number, public y: number) {
        this.x = Math.round(x);
    }
}

export class Sketch {
    private p: any
    private selectedSeatIndex?: number
    private showAnswersInStations: boolean

    constructor(private appStatus: Status, private settings: any, private stations: any) {
        this.selectedSeatIndex = null
        this.showAnswersInStations = false
    }

    run() {
        const objThis = this;
        new p5(p => {
            objThis.p = p
            const settings = objThis.settings
            const AISLE_WIDTH = 7;

            function getStationLocs(): StationLoc[] {
                const { columns, rows, aisleAfterColumn } = settings;
                const missingSeatIndexes = new Set(settings.missingSeatIndexes);
                const frontView = qi('#front-view').checked;
                const stationWidth = (p.width - AISLE_WIDTH) / columns;
                const stationHeight = p.height / rows;

                function adjustedX(row: number, col: number): number {
                    const view_adjusted_col = frontView ? columns - 1 - col : col;
                    const aisleXAdjustment = !settings.aisleAfterColumn ? 0 :
                        frontView ?
                            view_adjusted_col > columns - 1 - 1 - aisleAfterColumn ? AISLE_WIDTH : 0 :
                            view_adjusted_col > aisleAfterColumn ? AISLE_WIDTH : 0;

                    return view_adjusted_col * stationWidth + aisleXAdjustment;
                }

                function adjustedY(r) {
                    return (frontView ? rows - 1 - r : r) * stationHeight;
                }

                return Array.from({ length: rows }, (_, rowIndex) =>
                  Array.from({ length: columns }, (_, colIndex) => {
                    const seatIndex = rowIndex * columns + colIndex;
                    return missingSeatIndexes.has(seatIndex) ?
                        [] : new StationLoc(seatIndex, adjustedX(rowIndex, colIndex), adjustedY(rowIndex));
                  }).flat()  // remove empty arrays for missing seats
                ).flat();    // flatten array of arrays to an array
            }

            let stationLocs: StationLoc[] = [];

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

                function drawStation(stationLoc: StationLoc) {

                    function drawStatusTags(tagName: string, y: number, xMargin: number, xPerKey: number, tagHeight: number) {
                        const tagColors = [[45, 98, 163], [228, 113, 39], [142, 145, 143]];
                        settings.statuses.forEach((status: string[], index: number) => {
                            const key = status[0];
                            const code = status[1];
                            const x = stationLoc.x + xMargin + xPerKey * index;
                            const keyOrder = objThis.appStatus.orders[key];
                            if (keyOrder) {
                                const studentOrder = keyOrder[tagName];
                                if (studentOrder) {
                                    p.fill(tagColors[index % tagColors.length]);
                                    p.rect(x - 2, stationLoc.y + h - tagHeight - 3, xPerKey, tagHeight);
                                    p.fill(0);
                                    p.text(code + studentOrder.order, x, y);
                                }
                            }
                        });
                    }

                    p.textFont('Helvetica');
                    p.noStroke();
                    const station = objThis.stations[stationLoc.index];
                    p.fill(stationLoc.index === objThis.selectedSeatIndex ?
                        selectedColor : station.answer ?
                            pollAnswerSubmittedColor : 'warn' in station ?
                                settings.warningColor : settings.normalColor);
                    p.rect(stationLoc.x, stationLoc.y, w - 3, h - 3);

                    p.fill(0);
                    const xMargin = 2;
                    p.textSize(10);
                    p.textAlign(p.LEFT, p.TOP);
                    p.text(stationName(stationLoc.index), stationLoc.x + xMargin, stationLoc.y + 3);

                    if (station && station.name) {
                        p.fill(station.connected ? 0 : 128);
                        p.textAlign(p.RIGHT);
                        p.text(station.ip, stationLoc.x + w - xMargin - 2 /* todo why this 2 */, stationLoc.y + 3);
                        const parts = station.name.split(/,\s*/);
                        p.textSize(20);
                        p.textAlign(p.CENTER, p.CENTER);
                        const name = parts[1];
                        if (p.textWidth(name) > w) p.textSize(14);
                        p.text(name, stationLoc.x + w / 2, stationLoc.y + h / 3);
                        p.textSize(12);
                        p.text(parts[0], stationLoc.x + w / 2, stationLoc.y + h / 3 + 20);

                        p.textSize(14);
                        p.textAlign(p.LEFT, p.BOTTOM);
                        const xPerKey = (w - 2 * xMargin) / objThis.appStatus.keys.length;
                        const tagHeight = 1 / 3 * h;

                        const y = stationLoc.y + h - 4;
                        const answer = station.answer;
                        if (objThis.showAnswersInStations && answer) {
                            p.text(answer, stationLoc.x + xMargin, y);
                        } else {
                            drawStatusTags(station.name, y, xMargin, xPerKey, tagHeight);
                        }
                    }
                }

                p.background(255);

                stationLocs.forEach(drawStation);

                p.noLoop();
            };

            p.doubleClicked = () => {
                const w = stationWidth()
                const h = stationHeight()
                const x = p.mouseX
                const y = p.mouseY

                const clickedStation: StationLoc = stationLocs.find(loc =>
                    x >= loc.x && y >= loc.y && x <= loc.x + w && y <= loc.y + h)

                if (clickedStation) {
                    p.doubleClickListeners.forEach(l => l(clickedStation.index))
                }
            }

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

