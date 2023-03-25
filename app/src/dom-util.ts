export function q(selector): HTMLElement {
    return document.querySelector<HTMLElement>(selector)
}

export function qi(selector): HTMLInputElement {
    return document.querySelector<HTMLInputElement>(selector)
}

export function showIf(elem: HTMLElement, condition: boolean) {
    elem.style.display = condition ? 'block' : 'none'
}

export class Hider {
    // Store the original display property value for elements that are hidden
    private readonly shownDisplayTypes: Record<string, string> = {}

    /**
     * Show an HTML element.
     * @param element The HTML element to show.
     */
    show(element: HTMLElement): void {
        if (element.style.display === 'none') {
            // Set the element's display property to the original value, or 'block' if not available
            element.style.display = this.shownDisplayTypes[element.id] || 'block'
        }
    }

    /**
     * Hide an HTML element.
     * @param element The HTML element to hide.
     */
    hide(element: HTMLElement): void {
        if (element.style.display !== 'none') {
            // Store the current display property value
            this.shownDisplayTypes[element.id] = element.style.display

            // Set the element's display property to 'none' to hide it
            element.style.display = 'none'
        }
    }
}
