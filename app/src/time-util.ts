import {Period, Settings} from "./settings"
import {q} from "./dom-util"

export function updateTimeRemaining(settings: Settings): void {

    function formatTime(ms: number): string {

      function zeroPad(value: number): string {
        return (value < 10 ? '0' : '') + value.toString();
      }

      const s = ms / 1000;
      const hours = Math.floor(s / 3600);
      const minutes = Math.floor((s - hours * 3600) / 60);
      const seconds = Math.floor(s - hours * 3600 - minutes * 60);

      return `${zeroPad(hours)}:${zeroPad(minutes)}:${zeroPad(seconds)}`;
    }

    function todayWithHourMin(hhmm): Date {
        const parts = hhmm.split(':').map(n => Number(n));
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), parts[0], parts[1], 0);
    }

    const now: Date = new Date();
    let start: Date;
    let end: Date;

    const periodFound: Period = settings.periods.find(period => {
        start = todayWithHourMin(period[1]);
        end = todayWithHourMin(period[2]);
        return now >= start && now <= end;
    });

    const timeLeftElement = q('#time-left');
    const timeLeftTextElement = q('#time-left-text');

    if (periodFound) {
        const periodDuration: number = end.getTime() - start.getTime();
        const msLeft: number = periodDuration - (now.getTime() - start.getTime());
        const percentLeft: number = msLeft / periodDuration * 100;

        timeLeftElement.style.display = 'block';
        timeLeftTextElement.style.display = 'block';
        timeLeftElement.setAttribute('value', percentLeft.toString());
        timeLeftTextElement.textContent = formatTime(msLeft);
    } else {
        timeLeftElement.style.display = 'none';
        timeLeftTextElement.style.display = 'none';
    }

    window.setTimeout(() => updateTimeRemaining(settings), 1000);
}
