import UIKeyboard from 'h5p-lib-controls/src/scripts/ui/keyboard';
export default class UIKeyboardEx extends UIKeyboard {
  /**
   * An extension of UIKeyboard to handle extra keyboard events
   */
  constructor() {
    super();
  }

  shiftLeft(el) {
    if (this.controls.firesEvent('before-shift-left', el) !== false) {
      this.controls.firesEvent('shift-left', el);
      this.controls.firesEvent('after-shift-left', el)
    }
  }

  shiftRight(el) {
    if (this.controls.firesEvent('before-shift-right', el) !== false) {
      this.controls.firesEvent('shift-right', el);
      this.controls.firesEvent('after-shift-right', el)
    }
  }
  handleKeyDown(event) {
    switch (event.keyCode) {
      case 37: // Left Arrow
        // move to right
        if (!this.hasChromevoxModifiers(event)) {
          this.shiftLeft(event.target);
          event.preventDefault();
          event.stopPropagation();
        }
        break;
      case 39: // Right Arrow
        if (!this.hasChromevoxModifiers(event)) {
          this.shiftRight(event.target);
          event.preventDefault();
          event.stopPropagation();
        }
        break;
      default:
        super.handleKeyDown(event);
        break;
    }
  }
}
