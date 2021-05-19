import Util from './util';

//Special Sub-containers:
const SHOW_SOLUTION_CONTAINER = "h5p-drag-show-solution-container";
const SHOW_FEEDBACK_CONTAINER = "h5p-drag-show-feedback-container";

//CSS Dropzone feedback:
const CORRECT_FEEDBACK = 'h5p-drag-correct-feedback';
const WRONG_FEEDBACK = 'h5p-drag-wrong-feedback';

//CSS Draggable feedback:
const DRAGGABLE_FEEDBACK_CORRECT = 'h5p-drag-draggable-correct';
const DRAGGABLE_FEEDBACK_WRONG = 'h5p-drag-draggable-wrong';

/** Class represents a dropzone for code lines */
export default class Droppable {

  /**
   * Private class for keeping track of droppable zones.
   * @private
   *
   * @param {codeLine} solution - Correct code for this drop box.
   * @param {undefined/String} tip Tip for this container, optional.
   * @param {jQuery} dropzone Dropzone object.
   * @param {jQuery} dropzoneContainer Container Container for the dropzone.
   * @param {number} index.
   * @param {Object} params Behavior settings
   */
   constructor(solution, tip, dropzone, dropzoneContainer, index, params) {
    var self = this;
    const $ = H5P.jQuery;

    self.solution = solution;

    // self.text = solution.code; // current text
    self.text = "";
    self.indent = 0;
    self.lastIndent = 0;
    self.indentSpaces = 4;
    self.currentLeft = 0;
    self.tip = tip;
    self.index = index;
    self.params = params;
    self.error= [];
    self.check= false;
    self.isDistractor= false;
    if (self.params.indentBy2) {
      self.indentSpaces = 2;
    }

    /**
     * @type {Draggable}
     */
     self.containedDraggable = null;
     self.lastContainedDraggable = null;
     
     self.$dropzone = $(dropzone);
     self.$dropzoneContainer = $(dropzoneContainer);

     if (self.tip) {
      self.$tip = H5P.JoubelUI.createTip(self.tip, {
        tipLabel: self.params.tipLabel,
        tabcontrol: true
      });
      self.$dropzoneContainer.append(self.$tip);

      // toggle tabindex on tip, based on dropzone focus
      self.$dropzone.focus(() => self.$tip.attr('tabindex', '0'));
      self.$dropzone.blur(() => self.removeTipTabIndexIfNoFocus());
      self.$tip.blur(() => self.removeTipTabIndexIfNoFocus());
    }

    self.$incorrectText = $('<div/>', {
      html: self.params.incorrectText + " " + self.params.correctAnswer,
      'class': 'correct-answer'
    });

    self.$correctText = $('<div/>', {
      html: self.params.correctText,
      'class': 'correct-answer'
    });

    self.$showFeedback = $('<div/>', {
      'class': SHOW_FEEDBACK_CONTAINER
    }).appendTo(self.$dropzoneContainer).hide();

    self.$showSolution = $('<div/>', {
      'class': SHOW_SOLUTION_CONTAINER
    }).appendTo(self.$dropzoneContainer).hide();
  }

  removeTipTabIndexIfNoFocus() {
    const self = this;

    setTimeout(() => {
      if(!self.$dropzone.is(':focus') && !self.$tip.is(':focus')){
        self.$tip.attr('tabindex', '-1');
      }
    },0)
  }

  
  /**
   * Displays the solution next to the drop box if it is not correct.
   */
   showSolution() {
    self=this;
      self.check= false;
      self.isCorrect();
      const correct = self.check;
    if ( (!correct) ) {
      this.$showSolution.html(this.solution.htmlIndent());
      this.$dropzone.css('padding-left',0);
      this.$showSolution.css('padding-left',0);
      this.$showSolution.css('margin-left',0);
    }

    this.$showSolution.prepend(correct ? this.$correctText : this.$incorrectText);
    this.$showSolution.toggleClass('incorrect', !correct);
    this.$showSolution.show();
  }

  showSolution_distractor() {
    self=this;
      self.checkDistractor();
      const correct = self.checkDistractor();
        if (!correct) {
        this.$dropzone.css('padding-left',0);
        this.$showSolution.css('padding-left',0);
        this.$showSolution.css('margin-left',0);
    }

    this.$showSolution.prepend(correct ? this.$correctText : this.$incorrectText);
    this.$showSolution.show();
  }
   /**
    * Displays the feedback next to the drop box if it is not correct.
   */
    showFeedback() {
      self=this;
      self.check= false;
      const correct = self.isCorrect();
      if (!correct) {
          self.$showFeedback.html(self.error);
          console.log("show-droppable-feedback");
          self.$dropzone.css('padding-left', 0);
          self.$showFeedback.css('padding-left', 0);
          self.$showFeedback.css('margin-left', 5);
      }
  
      self.$showFeedback.prepend(correct ? self.$correctText : self.$incorrectText);
      self.$showFeedback.toggleClass('incorrect', !correct); 
      self.$showFeedback.show();
    };

  /**
   * Hides the solution.
   */
   hideSolution() {
    this.$showSolution.html('');
    this.$showSolution.hide();
  }

  /**
   * Hides the feedback.
   */
   hideFeedback() {
    this.$showFeedback.html('');
    this.$showFeedback.hide();
  }

  
  /**
   * Returns the html element
   *
   * @return {HTMLElement}
   */
   getElement() {
    return this.$dropzone.get(0);
  }

  /**
   * Appends the droppable to the provided container.
   *
   * @param {jQuery} $container Container which the dropzone will be appended to.
   */
   appendDroppableTo($container) {
    this.$dropzoneContainer.appendTo($container);
  }

  /**
   * Appends the draggable contained within this dropzone to the argument.
   * Returns the Draggable that was reverted, if any exists
   *
   * @param {jQuery} $container Container which the draggable will append to.
   *
   * @return {Draggable}
   */
   appendInsideDroppableTo($container) {
    if (this.containedDraggable !== null) {
      this.containedDraggable.revertDraggableTo($container);
      return this.containedDraggable;
    }
  }

  /**
   * Sets the contained draggable in this drop box to the provided argument.
   *
   * @param {Draggable} droppedDraggable A draggable that has been dropped on this box.
   */
   setDraggable(droppedDraggable) {

    var self = this;

    self.containedDraggable = droppedDraggable;
    self.text = droppedDraggable.getAnswerText();
    self.layout();
  }

  /**
   * Returns true if this dropzone currently has a draggable
   *
   * @return {boolean}
   */
   hasDraggable() {
    return !!this.containedDraggable;
  }

  /**
   * Removes the contained draggable in this box.
   */
   removeDraggable() {
    if (this.containedDraggable !== null) {
      this.lastContainedDraggable = this.containedDraggable;
      this.lastIndent = this.indent;
      this.containedDraggable = null;
      this.currentLeft = this.$dropzone.offset().left;
      this.indent = 0;
      this.text = "";
    }

    this.$dropzone.css('padding-left',"");
    this.$showSolution.css('padding-left',"");
    this.$showSolution.css('margin-left',"");
    this.$showFeedback.css('padding-left',"");
    this.$showFeedback.css('margin-left',"");
    this.$dropzone.show();
  }

  /**
   * Checks if this drop box contains the correct draggable.
   *
   * @returns {boolean} True if this box has the correct answer.
   */
   checkDistractor(){
    var solution =this.solution;
    return solution === this.text;
   }

   isCorrect() {
    var solution = this.solution;
    if(this.containedDraggable != null && solution.code === this.text && solution.indent == this.indent){
       this.check =true;
    }
    return this.containedDraggable != null && solution.code === this.text && solution.indent == this.indent;
  }

 
  isCorrect_noText() {
    if (this.containedDraggable === null) {
      return false;
    }
    var solution = this.solution;
    var answerIndentation = solution.indent; 

    return answerIndentation == this.indent;
  }

  isCorrect_noIndent() {
    if (this.containedDraggable === null) {
      return false;
    }
    var solution = this.solution; 

    return solution.code === this.text;
  }

  // isADistractor(){
  //   var solution = this.solution;
  //   if (solution===""){
  //     this.isDistractor =true;
    
  //  }
  //   return this.isDistractor;
  // }

  /**
   * Places draggables at the nearest indentation to drop location.
   **/
   layout() {
    // set to draggable to top of droppable
    this.containedDraggable.getDraggableElement().css('top', 0);

    // set draggable to nearest indent
    var newOffset = this.containedDraggable.getDraggableElement().offset().left;
    
    // if dragged beyond left edge, set to left edge
    if (newOffset < this.$dropzone.offset().left) {
      this.indent = 0;
      this.currentLeft = this.$dropzone.offset().left;
      this.containedDraggable.getDraggableElement().css('left', 0);
    }
    else {
      if (this.currentLeft < newOffset ) {
       while (this.currentLeft < newOffset) {
         this.shiftRight();
       }
     }
     else {
      while (this.currentLeft > newOffset && this.indent > 0) {
       this.shiftLeft();
     }
   }
 }
 this.resize();
}

/** 
 * Moves draggable one indentation level to the left
 **/
 shiftLeft() {
  if( this.indent >= 1 ){
    this.indent = this.indent - 1;
    var shift = this.indent * this.indentSpaces;
    this.containedDraggable.getDraggableElement().css('left', shift + 'ch');
    this.currentLeft = this.containedDraggable.getDraggableElement().offset().left;
      // if the draggable does not reach the edge of the drop zone, 
      // expand the width of the draggable to fit
      this.resize();
    }
  }

  /** 
   * Moves draggable one indentation level to the right
   **/
   shiftRight() {
    this.indent = this.indent + 1;
    var shift = this.indent * this.indentSpaces;
    this.containedDraggable.getDraggableElement().css('left', shift + 'ch');
    this.currentLeft = this.containedDraggable.getDraggableElement().offset().left;

    // if the draggable extends beyond the edge of the drop zone, 
    // reduce the width of the draggable to fit
    this.resize();
  }

  /**
   * Adjusts the width of the draggable to fit within the dropzone
   **/
   resize() {

    var draggableRightEdge = this.containedDraggable.getDraggableElement().offset().left  + this.containedDraggable.getDraggableElement().width();
    var containerRightEdge = this.$dropzone.offset().left + this.$dropzone.width();
    var variance = containerRightEdge - draggableRightEdge;

    var adjustedWidth = this.containedDraggable.getDraggableElement().width() + variance;

    this.containedDraggable.getDraggableElement().width(adjustedWidth);

  }

  /**
   * Sets CSS styling feedback for this drop box.
   */
   addFeedback() {

    //Draggable is correct
    if (this.isCorrect()) {
      this.$dropzone.removeClass(WRONG_FEEDBACK).addClass(CORRECT_FEEDBACK);

      //Draggable feedback
      this.containedDraggable.getDraggableElement().removeClass(DRAGGABLE_FEEDBACK_WRONG).addClass(DRAGGABLE_FEEDBACK_CORRECT);
    }
    else if (this.containedDraggable === null) {
      //Does not contain a draggable
      this.$dropzone.removeClass(WRONG_FEEDBACK).removeClass(CORRECT_FEEDBACK);
    }
    else {
      //Draggable is wrong
      this.$dropzone.removeClass(CORRECT_FEEDBACK).addClass(WRONG_FEEDBACK);

      //Draggable feedback
      if (this.containedDraggable !== null) {
        this.containedDraggable.getDraggableElement().addClass(DRAGGABLE_FEEDBACK_WRONG).removeClass(DRAGGABLE_FEEDBACK_CORRECT);
      }
    }
    // add two characters to width of dropzone to allow space for feedback indicator
    var newWidth = this.$dropzone.prop('style').width + 2;
    this.$dropzone.css('width', newWidth + 'ch');
  };

  /**
   * Removes all CSS styling feedback for this drop  *  * box.
   */
   removeFeedback() {
    this.$dropzone.removeClass(WRONG_FEEDBACK).removeClass(CORRECT_FEEDBACK);


    //Draggable feedback
    if (this.containedDraggable !== null) {
      this.containedDraggable.getDraggableElement().removeClass(DRAGGABLE_FEEDBACK_WRONG).removeClass(DRAGGABLE_FEEDBACK_CORRECT);
    }

    var newWidth = this.$dropzone.prop('style').width - 2;
    this.$dropzone.css('width', newWidth + 'ch');
  }

   

  /**
   * Returns true if the dropzone has visible feedback
   */
   hasFeedback() {
    return this.$dropzone.hasClass(WRONG_FEEDBACK) || this.$dropzone.hasClass(CORRECT_FEEDBACK);
  }

  /**
   * Sets short format of draggable when inside a dropbox.
   */
   setShortFormat() {
    if (this.containedDraggable !== null) {
      this.containedDraggable.setShortFormat();
    }
  }

  /**
   * Disables dropzone and the contained draggable.
   */
   disableDropzoneAndContainedDraggable() {
    if (this.containedDraggable !== null) {
      this.containedDraggable.disableDraggable();
    }
    this.$dropzone.droppable({ disabled: true});
  }

  /**
   * Enable dropzone.
   */
   enableDropzone() {
    this.$dropzone.droppable({ disabled: false});
  }

  /**
   * Removes the short format of draggable when it is outside a dropbox.
   */
   removeShortFormat() {
    if (this.containedDraggable !== null) {
      this.containedDraggable.removeShortFormat();
    }
  }

  /**
   * Gets this object's dropzone jQuery object.
   *
   * @returns {jQuery} This object's dropzone.
   */
   getDropzone() {
    return this.$dropzone;
  }

  /**
   * Return the unique index of the dropzone
   *
   * @returns {number}
   */
   getIndex() {
    return this.index;
  }

    /**
   * Return the level of indent of the dropzone contents.
   *
   * @returns {number}
   */
   getIndent()  {
    return this.indent;
  }

 /**
   * Return the error of the dropzone contents.
   *
   * @returns {[]}
   */
  getError()  {
    return this.error;
  }
}

