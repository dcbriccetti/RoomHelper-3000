export function q(selector): HTMLElement {
    return document.querySelector<HTMLElement>(selector);
}

export function qi(selector): HTMLInputElement {
    return document.querySelector<HTMLInputElement>(selector);
}

export function showIf(elem: HTMLElement, condition: boolean) {
  elem.style.display = condition ? 'block' : 'none';
}

