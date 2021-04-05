//CSS Draggable feedback:
const DRAGGABLE_DROPPED = "h5p-drag-dropped";

 export default class Draggable extends H5P.EventDispatcher {

  /**
   * Private class for keeping track of draggable code including indentation.
   * Follows design of H5P.DragText but stores codeLine objects instead of strings.
   *
   * @private
   * @param {codeLine} code that will be turned into a selectable line.
   * @param {jQuery} draggable Draggable object.
   * @param {number} index
   */
   constructor(codeLine, draggable, index) {

    super()
    
    var self = this;
    const $ = H5P.jQuery;

    self.codeLine = codeLine;
    self.insideDropzone = null;
    self.$draggable = $(draggable);
    self.$ariaLabel = self.$draggable.find('.h5p-hidden-read');
    self.index = index;
    self.initialIndex = index;

    self.shortFormat = self.codeLine.code;
    /* currently we do not shorten code lines, but left as a
       possible extension to look at later
    //Shortens the draggable string if inside a dropbox.
    if (self.shortFormat.length > 20) {
      self.shortFormat = self.shortFormat.slice(0, 17) + '...';
    }
    */
  }

  /**
   * Gets the index
   *
   * @return {number}
   */
   getIndex() {
    return this.index;
  }

  /**
   * Sets the index
   *
   * @param {number} index
   * @returns {Draggable}
   */
   setIndex(index) {
     this.index = index;
     return this;
   }

  /**
   * Gets the initial index
   *
   * @return {number}
   */
   getInitialIndex() {
    return this.initialIndex;
  }


  /**
   * Checks if a index is this droppables initial index
   *
   * @param {number} index
   * @returns {boolean}
   */
   hasInitialIndex(index) {
    return this.initialIndex === index;
  }

  /**
   * Moves the draggable to the provided container.
   *
   * @param {jQuery} $container Container the draggable will append to.
   */
   appendDraggableTo($container) {
    this.$draggable.detach().css({left: 0, top: 0}).appendTo($container);
  }

  /**
   * Reverts the draggable to its' provided container.
   *
   * @params {jQuery} $container The parent which the draggable will revert to.
   */
   revertDraggableTo($container) {
    // Prepend draggable to new container, but keep the offset,
    // then animate to new container's top:0, left:0
    this.$draggable.removeClass(DRAGGABLE_DROPPED);
    this.$draggable.detach()
    .css({left: 0, top: 0})
    .prependTo($container)
    .animate({left: 0, top: 0});
  }

  /**
   * Sets dropped feedback if the on the draggable if parameter is true.
   *
   * @params {Boolean} isDropped Decides whether the draggable has been dropped.
   */
   toggleDroppedFeedback(isDropped) {
    if (isDropped) {
      this.$draggable.addClass(DRAGGABLE_DROPPED);
    } else {
      this.$draggable.removeClass(DRAGGABLE_DROPPED);
    }
  }

  /**
   * Disables the draggable, making it immovable.
   */
   disableDraggable() {
    this.$draggable.draggable({ disabled: true});
  }

  /**
   * Enables the draggable, making it movable.
   */
   enableDraggable() {
    this.$draggable.draggable({ disabled: false});
  }

  /**
   * Gets the draggable jQuery object for this class.
   *
   * @returns {jQuery} Draggable item.
   */
   getDraggableElement() {
    return this.$draggable;
  }

  /**
   * Update Draggables "aria label"
   * @param {String} label [description]
   */
   updateAriaLabel(label) {
    this.$ariaLabel.html(label);
  }

  /**
   * Gets the draggable element for this class.
   *
   * @returns {HTMLElement}
   */
   getElement() {
    return this.$draggable.get(0);
  }

  /**
   * Removes this draggable from its dropzone, if it is contained in one,
   * and returns a reference to it
   *
   * @returns {Droppable}
   */
   removeFromZone() {
    var dropZone = this.insideDropzone;

    if (this.insideDropzone !== null) {
      this.insideDropzone.removeFeedback();
      this.insideDropzone.removeDraggable();
    }
    this.toggleDroppedFeedback(false);
    this.removeShortFormat();
    this.insideDropzone = null;

    return dropZone;
  }

  /**
   * Adds this draggable to the given dropzone.
   *
   * @param {Droppable} droppable The droppable this draggable will be added to.
   */
   addToZone(droppable) {
    if (this.insideDropzone !== null) {
      this.insideDropzone.removeDraggable();
    }
    this.toggleDroppedFeedback(true);
    this.insideDropzone = droppable;
    this.setShortFormat();
    this.trigger('addedToZone');
  }

  /**
   * Gets the code line for this draggable.
   *
   * @returns {String} The code line object in this draggable.
   */
   getCodeLine() {
    return this.codeLine;
  }

  /**
   * Gets the answer text for this draggable.
   *
   * @returns {String} The answer text in this draggable.
   */
   getAnswerText() {
    return this.codeLine.code;
  }

  /**
   * Sets short format of draggable when inside a dropbox.
   */
   setShortFormat() {
    /* short form not currently used
    this.$draggable.html(this.shortFormat);
    short form current loses a11y labels
    */
  }

  /**
   * Get short format of draggable when inside a dropbox.
   *
   * @returns {String|*}
   */
   getShortFormat() {
    return this.shortFormat;
  }

  /**
   * Removes the short format of draggable when it is outside a dropbox.
   */
   removeShortFormat() {
    /* short form not currently used
    this.$draggable.html(this.codeLine.code);
    */
  }

  /**
   * Get the droppable this draggable is inside
   *
   * @returns {Droppable} Droppable
   */
   getInsideDropzone() {
    return this.insideDropzone;
  }

  /**
   * Returns true if inside dropzone
   *
   * @returns {boolean}
   */
   isInsideDropZone() {
    return !!this.insideDropzone;
  }
}


