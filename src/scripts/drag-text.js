import { parseText, lex } from './parse-text';
import StopWatch from './stop-watch';
import Util from './util';
import Draggable from './draggable';
import Droppable from './droppable';
import CodeParser from './code-parser';

import Controls from 'h5p-lib-controls/src/scripts/controls';
import AriaDrag from 'h5p-lib-controls/src/scripts/aria/drag';
import AriaDrop from 'h5p-lib-controls/src/scripts/aria/drop';
import UIKeyboard from 'h5p-lib-controls/src/scripts/ui/keyboard';
import Mouse from 'h5p-lib-controls/src/scripts/ui/mouse';

/**
 * @typedef {object} H5P.DragTextEvent
 * @property {HTMLElement} element The element being dragged
 * @property {HTMLElement} [target] The target element
 */
/**
 * Drag event
 * @event H5P.DragText#drag
 * @type {H5P.DragTextEvent}
 */
/**
 * Drop event
 * @event H5P.DragText#drop
 * @type {H5P.DragTextEvent}
 */
/**
 * Revert event
 * @event H5P.DragText#revert
 * @type {H5P.DragTextEvent}
 */
/**
 * Start event
 * @event H5P.DragText#start
 * @type {H5P.DragTextEvent}
 */
/**
 * Stop event
 * @event H5P.DragText#stop
 * @type {H5P.DragTextEvent}
 */
/**
 * Drag Text module
 * @external {jQuery} $ H5P.jQuery
 */
H5P.ParsonsPuzzle = (function ($, Question, ConfirmationDialog) {
  //CSS Main Containers:
  var INNER_CONTAINER = "h5p-drag-inner";
  var TASK_CONTAINER = "h5p-drag-task";
  var WORDS_CONTAINER = "h5p-drag-droppable-words";
  var DROPZONE_CONTAINER = "h5p-drag-dropzone-container";
  var DRAGGABLES_CONTAINER = "h5p-drag-draggables-container";
  var CODE_LINE = "h5p-drag-code";

  /**
   * Initialize module.
   *
   * @class H5P.DragText
   * @extends H5P.Question
   * @param {Object} params Behavior settings
   * @param {Number} contentId Content identification
   * @param {Object} contentData Object containing task specific content data
   *
   * @returns {Object} DragText Drag Text instance
   */
  function ParsonsPuzzle(params, contentId, contentData) {
    this.$ = $(this);
    this.contentId = contentId;
    this.contentData = contentData;
    Question.call(this, 'drag-text');

    // Set default behavior.
    this.params = $.extend(true, {
      puzzleInstructions: "Drag the code lines to the solutions box to create a working program. Indent the code lines by dragging them into the correct position.",
      codeBlock: "",
      overallFeedback: [],
      checkAnswer: "Check",
      tryAgain: "Retry",
      behaviour: {
        enableRetry: true,
        enableSolutionsButton: true,
        enableCheckButton: true,
        instantFeedback: false
      },
      showSolution : "Show solution",
      dropZoneIndex: "Drop Zone @index.",
      empty: "Empty.",
      contains: "Drop Zone @index contains draggable @draggable.",
      ariaDraggableIndex: "@index of @count.",
      tipLabel: "Show tip",
      correctText: "Correct!",
      incorrectText: "Incorrect!",
      resetDropTitle: "Reset drop",
      resetDropDescription: "Are you sure you want to reset this drop zone?",
      grabbed: "Draggable is grabbed.",
      cancelledDragging: "Cancelled dragging.",
      correctAnswer: "Correct answer:",
      scoreBarLabel: 'You got :num out of :total points',
      a11yCheck: 'Check the answers. The responses will be marked as correct, incorrect, or unanswered.',
      a11yShowSolution: 'Show the solution. The task will be marked with its correct solution.',
      a11yRetry: 'Retry the task. Reset all responses and start the task over again.',
    }, params);

    this.contentData = contentData;
    if (this.contentData !== undefined && this.contentData.previousState !== undefined && this.contentData.previousState.length !== undefined) {
      this.previousState = this.contentData.previousState;
    }

    // Keeps track of if Question has been answered
    this.answered = false;
    this.instantFeedbackEvaluationFilled = false;

    // Convert line breaks to HTML
    this.codeBlockHtml = this.params.codeBlock.replace(/(\r\n|\n|\r)/gm, "<br/>");
    this.codeBlock = this.params.codeBlock;

    // set number of spaces for block indentations
    if (this.params.indentBy2) {
      this.indentationSpacing = 2;
    }
    else {
      this.indentationSpacing = 4;
    }

    // introduction field id
    this.introductionId = 'h5p-drag-text-' + contentId + '-introduction';

    /**
     * @type {HTMLElement} selectedElement
     */
    this.selectedElement = undefined;

    this.oldBoundHandleKeyDown1 = undefined;
    this.oldBoundHandleKeyDown2 = undefined;
    var self = this;

    function myHandleKeyDown(event) {
      var ret = true;
      switch (event.which) {
        case 37: // Left Arrow
            // move to right
          if(!this.hasChromevoxModifiers(event)) {
            var droppable = self.getDroppableByElement(event.srcElement);
            droppable.shiftLeft();
            event.preventDefault();
            event.stopPropagation();
          }
          break;
        case 39: // Right Arrow
          if(!this.hasChromevoxModifiers(event)) {
            var droppable = self.getDroppableByElement(event.srcElement);
            droppable.shiftRight();
            event.preventDefault();
            event.stopPropagation();
          }
          break;
        default:
          ret = false;
      }
      return ret;
    }
    function myHandleKeyDown1(event) {
      if( !myHandleKeyDown.apply(this, [event])){
        self.oldBoundHandleKeyDown1(event);
      }
    }

    function myHandleKeyDown2(event) {
      if( !myHandleKeyDown.apply(this, [event])){
        self.oldBoundHandleKeyDown2( event);
      }
    }

    // Init keyboard navigation
    this.ariaDragControls = new AriaDrag();
    this.ariaDropControls = new AriaDrop();

    var keyboard1 = new UIKeyboard();
    var keyboard2 = new UIKeyboard();

    this.dragControls = new Controls([keyboard1, new Mouse(), this.ariaDragControls]);
    this.dragControls.useNegativeTabIndex();

    this.dropControls = new Controls([keyboard2, new Mouse(), this.ariaDropControls]);
    this.dropControls.useNegativeTabIndex();

    this.oldBoundHandleKeyDown1 = keyboard1.boundHandleKeyDown;
    this.oldBoundHandleKeyDown2 = keyboard2.boundHandleKeyDown;

    keyboard1.boundHandleKeyDown = myHandleKeyDown1.bind(keyboard1);
    keyboard2.boundHandleKeyDown = myHandleKeyDown2.bind(keyboard2);

    // return false to prevent select from happening when draggable is disabled
    this.dragControls.on('before-select', event => !this.isElementDisabled(event.element));

    this.dragControls.on('select', this.keyboardDraggableSelected, this);
    this.dropControls.on('select', this.keyboardDroppableSelected, this);

    // add and remove droppables on start/stop drag from controls
    this.on('start', this.addAllDroppablesToControls, this);
    this.on('revert', this.removeControlsFromEmptyDropZones, this);
    this.on('stop', event => {
      if(!event.data.target) {
        this.removeControlsFromDropZonesIfAllEmpty();
      }
    }, this);
    this.on('drop', this.removeControlsFromEmptyDropZones, this);

    // toggle label for draggable
    this.on('start', event => {
      const element = event.data.element;
      const draggable = this.getDraggableByElement(element);

      // on drag and drop, toggle aria-dropeffect between 'move', and 'none'
      this.toggleDropEffect();
      element.setAttribute('aria-grabbed', 'true')
      this.setDraggableAriaLabel(draggable);
    });

    this.on('stop', event => {
      const element = event.data.element;
      const draggable = this.getDraggableByElement(element);

      // on drag and drop, toggle aria-dropeffect between 'move', and 'none'
      this.toggleDropEffect();
      element.setAttribute('aria-grabbed', 'false')
      this.setDraggableAriaLabel(draggable);
    });

    // on drop, remove all dragging
    this.on('drop', this.ariaDropControls.setAllToNone, this.ariaDropControls);

    // on drop remove element from drag controls
    this.on('drop', function(event) {
      this.dragControls.removeElement(event.data.element);
    }, this);

    // on revert, re add element to drag controls
    this.on('revert', function(event) {
      this.dragControls.insertElementAt(event.data.element, 0);
    }, this);

    this.on('drop', this.updateDroppableElement, this);
    this.on('revert', this.updateDroppableElement, this);

    // Init drag text task
    this.initDragText();

    // Start stop watch
    this.stopWatch = new StopWatch();
    this.stopWatch.start();

    // toggle the draggable container
    this.on('revert', this.toggleDraggablesContainer, this);
    this.on('drop', this.toggleDraggablesContainer, this);

    // Indicate operations trough read speaker
    this.on('stop', event => {
      if(!event.data.target) {
        this.read(this.params.cancelledDragging);
      }
    });

    // trigger instant feedback
    if (this.params.behaviour.instantFeedback) {
      this.on('revert', () => this.instantFeedbackEvaluation());
    }
  }

  ParsonsPuzzle.prototype = Object.create(Question.prototype);
  ParsonsPuzzle.prototype.constructor = ParsonsPuzzle;

  /**
   * Updates the state of a droppable element
   *
   * @param event
   */
  ParsonsPuzzle.prototype.updateDroppableElement = function(event) {
    const dropZone = event.data.target;
    const draggable = event.data.element;
    const droppable = this.getDroppableByElement(dropZone);

    if (dropZone) {
      this.setDroppableLabel(dropZone, draggable.textContent, droppable.getIndex());
    }
  };

  /**
   * Remove controls from dropzones if all is empty
   */
  ParsonsPuzzle.prototype.removeControlsFromDropZonesIfAllEmpty = function() {
    if (!this.anyDropZoneHasDraggable()) {
      this.removeAllDroppablesFromControls();
    }
  };

  /**
   * Remove controls from dropzones without draggables
   */
  ParsonsPuzzle.prototype.removeControlsFromEmptyDropZones = function() {
    this.droppables
      .filter(droppable => !droppable.hasDraggable())
      .map(droppable => droppable.getElement())
      .forEach(el => {
        this.dropControls.removeElement(el);
      });
  };

  /**
   * Add all drop zones to drop keyboard controls
   */
  ParsonsPuzzle.prototype.addAllDroppablesToControls = function() {
    // to have a clean start, remove all first
    if(this.dropControls.count() > 0){
      this.removeAllDroppablesFromControls();
    }

    // add droppables in correct order
    this.droppables
      .map(droppable => droppable.getElement())
      .forEach(el => this.dropControls.addElement(el));
  };

  /**
   * Remove all drop zones from drop keyboard controls
   */
  ParsonsPuzzle.prototype.removeAllDroppablesFromControls = function() {
    this.droppables
      .map(droppable => droppable.getElement())
      .forEach(el => this.dropControls.removeElement(el));
  };

  /**
   * Remove all drop zones from drop keyboard controls
   */
  ParsonsPuzzle.prototype.anyDropZoneHasDraggable = function() {
    return this.droppables.some(droppable => droppable.hasDraggable());
  };

  /**
   * Sets the aria-label of a dropzone based on whether it has a droppable inside it
   *
   * @param {HTMLElement} dropZone
   * @param {string} text
   * @param {number} index
   */
  ParsonsPuzzle.prototype.setDroppableLabel = function(dropZone, text, index) {
    const indexText = this.params.dropZoneIndex.replace('@index', index.toString());
    const correctFeedback = dropZone.classList.contains('h5p-drag-correct-feedback');
    const inCorrectFeedback = dropZone.classList.contains('h5p-drag-wrong-feedback');
    const checkButtonPressed = correctFeedback || inCorrectFeedback;
    const hasChildren = (dropZone.childNodes.length > 0);

    if (dropZone) {
      if (checkButtonPressed) {
        const droppable = this.getDroppableByElement(dropZone);
        let resultString = '';
        if (correctFeedback) {
          resultString = droppable.correctFeedback ? droppable.correctFeedback : this.params.correctText;
        }
        else {
          resultString = droppable.incorrectFeedback ? droppable.incorrectFeedback : this.params.incorrectText;
        }
        dropZone.setAttribute('aria-label', `${indexText} ${this.params.contains.replace('@index', index.toString()).replace('@draggable', text)} ${resultString}.`);
      }
      else if (hasChildren) {
        dropZone.setAttribute('aria-label', `${indexText} ${this.params.contains.replace('@index', index.toString()).replace('@draggable', text)}`);
      }
      else {
        dropZone.setAttribute('aria-label',  `${indexText} ${this.params.empty.replace('@index', index.toString())}`);
      }
    }
  };

  /**
   * Registers this question type's DOM elements before they are attached.
   * Called from H5P.Question.
   */
  ParsonsPuzzle.prototype.registerDomElements = function () {
    // Register task introduction text
    this.$introduction = $('<p id="' + this.introductionId + '">' + this.params.puzzleInstructions + '</p>');
    this.setIntroduction(this.$introduction);
    this.$introduction.parent().attr('tabindex', '-1');

    // Register task content area
    this.setContent(this.$inner);

    // Register buttons
    this.addButtons();
  };

  /**
   * Initialize drag text task
   */
  ParsonsPuzzle.prototype.initDragText = function () {
    this.$inner = $('<div/>', {
      'aria-describedby': this.introductionId,
      'class': INNER_CONTAINER
    });

    // Create task
    this.addTaskTo(this.$inner);

    // Set stored user state
    this.setH5PUserState();

    return this.$inner;
  };

  /**
   * Add check solution, show solution and retry buttons, and their functionality.
   */
  ParsonsPuzzle.prototype.addButtons = function () {
    var self = this;

    if (self.params.behaviour.enableCheckButton) {
      // Checking answer button
      self.addButton('check-answer', self.params.checkAnswer, function () {
        self.answered = true;
        self.removeAllElementsFromDragControl();

        if (!self.showEvaluation()) {
          if (self.params.behaviour.enableRetry) {
            self.showButton('try-again');
          }
          if (self.params.behaviour.enableSolutionsButton) {
            self.showButton('show-solution');
          }
          self.hideButton('check-answer');
          self.disableDraggables();
        } else {
          self.hideButton('show-solution');
          self.hideButton('try-again');
          self.hideButton('check-answer');
        }

        // Focus top of the task for natural navigation
        self.$introduction.parent().focus();
      }, !self.params.behaviour.instantFeedback, {
        'aria-label': self.params.a11yCheck,
      });
    }

    //Show Solution button
    self.addButton('show-solution', self.params.showSolution, function () {
      self.droppables.forEach(function (droppable) {
        droppable.showSolution();
      });
      self.draggables.forEach(draggable => self.setDraggableAriaLabel(draggable));
      self.disableDraggables();
      self.$draggables.css('display','none');
      self.removeAllDroppablesFromControls();
      self.hideButton('show-solution');
    }, self.initShowShowSolutionButton || false, {
      'aria-label': self.params.a11yShowSolution,
    });

    //Retry button
    self.addButton('try-again', self.params.tryAgain, function () {
      // Reset and shuffle draggables if Question is answered
      if (self.answered) {
        // move draggables to original container
        self.resetDraggables();
        self.resetDroppables();
      }
      self.answered = false;

      self.hideEvaluation();
      self.hideExplanation();

      self.hideButton('try-again');
      self.hideButton('show-solution');

      if (self.params.behaviour.instantFeedback) {
        self.enableAllDropzonesAndDraggables();
      } else {
        self.showButton('check-answer');
        self.enableDraggables();
      }
      self.hideAllSolutions();

      self.$draggables.css('display','inline');


      self.stopWatch.reset();
      self.read(self.params.puzzleInstructions);
    }, self.initShowTryAgainButton || false, {
      'aria-label': self.params.a11yRetry,
    });
  };

  /**
   * Removes keyboard support for all elements left in the draggables
   * list.
   */
  ParsonsPuzzle.prototype.removeAllElementsFromDragControl = function () {
    this.dragControls.elements.forEach(element => this.dragControls.removeElement(element));
  };

  /**
   * Handle selected draggable
   *
   * @param {ControlsEvent} event
   *
   * @fires H5P.DragText#start
   */
  ParsonsPuzzle.prototype.keyboardDraggableSelected = function (event) {
    var tmp = this.selectedElement;
    var hasSelectedElement = this.selectedElement !== undefined;
    var isSelectedElement = this.selectedElement ===  event.element;

    // un select the selected
    if(hasSelectedElement){
      this.selectedElement = undefined;
      this.trigger('stop', { element: tmp });
    }

    // no previous selected or not the selected one
    if((!hasSelectedElement || !isSelectedElement) && !this.isElementDisabled(event.element)) {
      this.selectedElement = event.element;
      this.trigger('start', { element: event.element });
      this.focusOnFirstEmptyDropZone();
    }
  };

  /**
   * Focuses on the first empty drop zone
   */
  ParsonsPuzzle.prototype.focusOnFirstEmptyDropZone = function() {
    const dropZone = this.droppables
      .filter(droppable => !droppable.hasDraggable())[0];
    const element = dropZone.getElement();

    this.dropControls.setTabbable(element);
    element.focus();
  };

  /**
   * Returns true if aria-disabled="true" on the element
   *
   * @param {HTMLElement} element
   *
   * @return {boolean}
   */
  ParsonsPuzzle.prototype.isElementDisabled = function (element) {
    return element.getAttribute('aria-disabled') === 'true';
  };

  /**
   * Handle selected droppable
   *
   * @param {ControlsEvent} event
   */
  ParsonsPuzzle.prototype.keyboardDroppableSelected = function (event) {
    var self = this;

    var droppableElement = event.element;
    var droppable = self.getDroppableByElement(droppableElement);
    var draggable = self.getDraggableByElement(this.selectedElement);

    var isCorrectInstantFeedback = this.params.behaviour.instantFeedback && droppable && droppable.isCorrect();
    var isShowingFeedback = !this.params.behaviour.instantFeedback && droppable.hasFeedback();

    // if something selected
    if(draggable && droppable && !isCorrectInstantFeedback) {
      var tmp = self.selectedElement;
      // initiate drop
      self.drop(draggable, droppable);

      self.selectedElement = undefined;

      // update selected
      this.trigger('stop', {
        element: tmp,
        target: droppable.getElement()
      });
    }
    else if(droppable && droppable.hasDraggable() && !isShowingFeedback && !isCorrectInstantFeedback) {
      var containsDropped = droppableElement.querySelector('[aria-grabbed]');

      this.createConfirmResetDialog(function () {
        self.revert(self.getDraggableByElement(containsDropped));
      }).show();
    }
  };

  /**
   * Initialize drag text task
   */
  ParsonsPuzzle.prototype.toggleDraggablesContainer = function () {
    var isEmpty = this.$draggables.children().length === 0;
    this.$draggables.toggleClass('hide', isEmpty);
  };

  /**
   * Opens a confirm dialog, where the user has to confirm that they want to reset a droppable
   *
   * @param {function} callback
   * @param {object} [scope]
   *
   * @returns {ConfirmationDialog}
   */
  ParsonsPuzzle.prototype.createConfirmResetDialog = function (callback, scope) {
    var self = this;
    var dialog = new ConfirmationDialog({
      headerText: self.params.resetDropTitle,
      dialogText: self.params.resetDropDescription
    });

    dialog.appendTo(document.body);
    dialog.on('confirmed', callback, scope || this);

    return dialog;
  };

  /**
   * Shows feedback for dropzones.
   */
  ParsonsPuzzle.prototype.showDropzoneFeedback = function () {
    this.droppables.forEach(droppable => {
      droppable.addFeedback();
      const draggable = droppable.containedDraggable;

      if (droppable && draggable) {
        this.setDroppableLabel(droppable.getElement(), draggable.getElement().textContent, droppable.getIndex());
        this.setDraggableAriaLabel(draggable);
      }
    });
  };

  /**
   * Generates data that is used to render the explanation container
   * at the bottom of the content type
   */
  ParsonsPuzzle.prototype.showExplanation = function () {
    const self = this;
    let explanations = [];

    this.droppables.forEach(droppable => {
      const draggable = droppable.containedDraggable;

      if (droppable && draggable) {
        if (droppable.isCorrect() && droppable.correctFeedback) {
          explanations.push({
            correct: draggable.text,
            text: droppable.correctFeedback
          });
        }

        if (!droppable.isCorrect() && droppable.incorrectFeedback) {
          explanations.push({
            correct: droppable.text,
            wrong: draggable.text,
            text: droppable.incorrectFeedback
          });
        }
      }
    });

    if (explanations.length !== 0) {
      this.setExplanation(explanations, self.params.feedbackHeader);
    }
  };

  /**
   * Evaluate task and display score text for word markings.
   *
   * @param {boolean} [skipXapi] Skip sending xAPI event answered
   *
   * @returns {Boolean} Returns true if maxScore was achieved.
   */
  ParsonsPuzzle.prototype.showEvaluation = function (skipXapi) {
    this.hideEvaluation();
    this.showDropzoneFeedback();
    this.showExplanation();

    var score = this.calculateScore();
    var maxScore = this.droppables.length;

    if (!skipXapi) {
      var xAPIEvent = this.createXAPIEventTemplate('answered');
      this.addQuestionToXAPI(xAPIEvent);
      this.addResponseToXAPI(xAPIEvent);
      this.trigger(xAPIEvent);
    }

    var scoreText = H5P.Question.determineOverallFeedback(this.params.overallFeedback, score / maxScore)
      .replace(/@score/g, score.toString())
      .replace(/@total/g, maxScore.toString());

    if (score === maxScore) {
      //Hide buttons and disable task
      this.hideButton('check-answer');
      this.hideButton('show-solution');
      this.hideButton('try-again');
      this.disableDraggables();
    }
    this.trigger('resize');

    // Set feedback score
    this.setFeedback(scoreText, score, maxScore, this.params.scoreBarLabel);

    return score === maxScore;
  };

  /**
   * Returns the number of correct entries
   *
   * @returns {number}
   */
  ParsonsPuzzle.prototype.calculateScore = function () {
    return this.droppables.reduce(function (sum, entry) {
      return sum + (entry.isCorrect() ? 1 : 0);
    }, 0);
  };

  /**
   * Clear the evaluation text.
   */
  ParsonsPuzzle.prototype.hideEvaluation = function () {
    this.removeFeedback();
    this.trigger('resize');
  };

  /**
   * Remove the explanation container
   */
  ParsonsPuzzle.prototype.hideExplanation = function () {
    this.setExplanation();
    this.trigger('resize');
  };

  /**
   * Hides solution text for all dropzones.
   */
  ParsonsPuzzle.prototype.hideAllSolutions = function () {
    this.droppables.forEach(function (droppable) {
      droppable.hideSolution();
    });
    this.trigger('resize');
  };

  ParsonsPuzzle.prototype.hideDraggables = function() {
    this.$draggables.css('display', 'none');
    this.trigger('resize');
  }

  /**
   * Handle task and add it to container.
   *
   * @param {jQuery} $container The object which our task will attach to.
   */
  ParsonsPuzzle.prototype.addTaskTo = function ($container) {
    var self = this;
    self.widestDraggable = 0;
    self.droppables = [];
    self.draggables = [];

    self.$taskContainer = $('<div/>', {
      'class': TASK_CONTAINER
    });

    self.$draggables = $('<div/>', {
      'class': DRAGGABLES_CONTAINER
    });

    self.$wordContainer = $('<div/>', {
      'class': WORDS_CONTAINER
    });

    const parser = new CodeParser(2);
    const ret = parser.parse(self.codeBlock, self.indentationSpacing);

    ret.modifiedLines.forEach(function (codeLine) {
          const draggable = self.createDraggable(codeLine);
          if( !codeLine.distractor) {
            const solution = ret.solutions[codeLine.lineNo];
            const droppable = self.createDroppable(solution, solution.tip, solution.correctFeedback, solution.incorrectFeedback);

            // trigger instant feedback
            if (self.params.behaviour.instantFeedback) {
              draggable.getDraggableElement().on('dragstop', function() {
                droppable.addFeedback();
                self.instantFeedbackEvaluation();
              });
            }
            self.$wordContainer.append("</br>");
          }
      });

    self.shuffleAndAddDraggables(self.$draggables);
    self.$draggables.appendTo(self.$taskContainer);
    self.$wordContainer.appendTo(self.$taskContainer);
    self.$taskContainer.appendTo($container);
    self.addDropzoneWidth();
  };

  /**
   * Returns true if part starts and ends with an asterisk
   *
   * @param {string} part
   *
   * @returns {boolean}
   */
  ParsonsPuzzle.prototype.isAnswerPart = function(part) {
    return Util.startsWith('*', part) && Util.endsWith('*', part);
  };

  /**
   * Matches the width of all dropzones to the widest draggable, and sets widest class variable.
   */
  ParsonsPuzzle.prototype.addDropzoneWidth = function () {
    var self = this;
    var widestField = 0;
    var widestDraggable = 0;

    function decodeHtml(str) {
      var map =
        {
          '&amp;': '&',
          '&lt;': '<',
          '&gt;': '>',
          '&quot;': '"',
          '&#039;': "'"
        };
      return str.replace(/&amp;|&lt;|&gt;|&quot;|&#039;/g, function (m) { return map[m];});
    }

    //Find widest draggable
    self.draggables.forEach(function (draggable) {

      var nonHTMLCode = decodeHtml(draggable.codeLine.code);

      var fieldWidth = nonHTMLCode.length + (draggable.codeLine.indent * self.indentationSpacing);

      widestField = fieldWidth > widestField ? fieldWidth : widestField;
      widestDraggable = nonHTMLCode.length > widestDraggable ? nonHTMLCode.length : widestDraggable;

    });

    self.widestDraggable = widestDraggable;
    self.widestField = widestField;

    //Adjust all droppables and draggables to widest size.
    self.droppables.forEach(function (droppable) {
      droppable.getDropzone().css('width', self.widestField+'ch');
    });

    self.draggables.forEach(function (draggable) {
      draggable.getDraggableElement().css('width', self.widestDraggable+'ch');
    });

  };

  /**
   * Makes a drag n drop from the specified text.
   *
   * @param {String} answer Text for the drag n drop.
   *
   * @returns {H5P.TextDraggable}
   */
  ParsonsPuzzle.prototype.createDraggable = function (codeLine) {
    var self = this;
    var answer = codeLine.code;

    //Make the draggable
    var $draggable = $('<div/>', {
      html: `<span>${answer}</span>`,
      role: 'button',
      'aria-grabbed': 'false',
      tabindex: '-1'
    }).draggable({
      revert: function(isValidDrop) {
        if (!isValidDrop) {
          self.revert(draggable);
        }
        return false;
      },
      drag: self.propagateDragEvent('drag', self),
      start: self.propagateDragEvent('start', self),
      stop: function (event) {
        /*
        console.log("==================");
        console.log("draggable event: clientX " + event.clientX.toString() + ",clientY: " + event.clientY.toString());
        console.log("draggable event: offsetX " + event.offsetX.toString() + ",offsetY: " + event.offsetY.toString());
        console.log("draggable event: screenX " + event.screenX.toString() + ",screenY: " + event.screenY.toString());
        console.log("==================");
        */

        self.trigger('stop', {
          element: draggable.getElement(),
          target: event.target
        });
      },
      containment: self.$taskContainer
    }).append($('<span>', {
      'class': 'h5p-hidden-read'
    }));

    var draggable = new Draggable(codeLine, $draggable, self.draggables.length);
    draggable.on('addedToZone', function () {
      self.triggerXAPI('interacted');
    });

    self.draggables.push(draggable);

    return draggable;
  };

  /**
   * Creates a Droppable
   *
   * @param {string} solution
   * @param {string} [tip]
   *
   * @returns {H5P.TextDroppable}
   */
  ParsonsPuzzle.prototype.createDroppable = function (solution, tip, correctFeedback, incorrectFeedback) {
    var self = this;

    var draggableIndex = this.draggables.length;

    //Make the dropzone
    var $dropzoneContainer = $('<div/>', {
      'class': DROPZONE_CONTAINER
    });

    var $dropzone = $('<div/>', {
      'aria-dropeffect': 'none',
      'aria-label':  this.params.dropZoneIndex.replace('@index', draggableIndex.toString()) + ' ' + this.params.empty.replace('@index', draggableIndex.toString()),
      'tabindex': '-1'
    }).appendTo($dropzoneContainer)
      .droppable({
        tolerance: 'pointer',
        drop: function (event, ui) {
          var draggable = self.getDraggableByElement(ui.draggable[0]);
          var droppable = self.getDroppableByElement(event.target);

          console.log("******************");
          console.log("dropzone event: clientX " + event.clientX.toString() + ",clientY: " + event.clientY.toString());
          console.log("dropzone event: offsetX " + event.offsetX.toString() + ",offsetY: " + event.offsetY.toString());
          console.log("dropzone event: screenX " + event.screenX.toString() + ",screenY: " + event.screenY.toString());
          console.log("draggable.$draggable.offset():  " + JSON.stringify(draggable.$draggable.offset()));
          console.log("droppable.$dropzone.offset():  " + JSON.stringify(droppable.$dropzone.offset()));
          console.log("draggable.$draggable.position():  " + JSON.stringify(draggable.$draggable.position()));
          console.log("droppable.$dropzone.position():  " + JSON.stringify(droppable.$dropzone.position()));
          console.log("******************");

          /**
           * Note that drop will run for all initialized DragText dropzones globally. Even other
           * DragTexts instances. Thus if no matching draggable or droppable is found
           * for this dropzone we must skip it.
           */
          if (!draggable || !droppable) {
            return;
          }
          self.drop(draggable, droppable);
        }
      });

    var droppable = new Droppable(solution, tip, correctFeedback, incorrectFeedback, $dropzone, $dropzoneContainer, draggableIndex, self.params);
    droppable.appendDroppableTo(self.$wordContainer);

    self.droppables.push(droppable);

    return droppable;
  };

  /**
   * Propagates a jQuery UI event
   *
   * @param {string} part
   * @param {string} object
   * @param {object} event
   *
   * @function
   * @returns {boolean}
   */
  ParsonsPuzzle.prototype.propagateDragEvent = Util.curry(function(eventName, self, event) {
    self.trigger(eventName, {
      element: event.target
    });
  });

  /**
   * Resets a draggable
   *
   * @param {H5P.TextDraggable} draggable
   *
   * @fires H5P.DragText#revert
   * @fires Question#resize
   */
  ParsonsPuzzle.prototype.revert = function (draggable) {
    var droppable = draggable.removeFromZone();
    var target = droppable ? droppable.getElement() : undefined;

    draggable.revertDraggableTo(this.$draggables);
    this.setDraggableAriaLabel(draggable);

    this.trigger('revert', { element: draggable.getElement(), target: target });
    this.trigger('resize');
  };

  /**
   * Handles dropping an element
   *
   * @param {H5P.TextDraggable} draggable
   * @param {H5P.TextDroppable} droppable
   *
   * @fires H5P.DragText#revert
   * @fires H5P.DragText#drop
   * @fires Question#resize
   */
  ParsonsPuzzle.prototype.drop = function (draggable, droppable) {
    var self = this;
    self.answered = true;

    draggable.removeFromZone();

    // if this droppable contains a different draggable, revert the contained draggable back to draggables container
    if (!(droppable.containedDraggable === draggable)) {

      // if the droppable already contains another draggable
      var revertedDraggable = droppable.appendInsideDroppableTo(this.$draggables);

      // trigger revert, if revert was performed
      if(revertedDraggable){
        self.trigger('revert', {
          element: revertedDraggable.getElement(),
          target: droppable.getElement()
        });
      }
    }


    var offset = draggable.getDraggableElement().offset().left;

    draggable.appendDraggableTo(droppable.getDropzone());

    // reset left offset as appendDraggableTo sets both left and top to 0
    draggable.getDraggableElement().offset({'left': offset});

    droppable.setDraggable(draggable);

    if (self.params.behaviour.instantFeedback) {
      droppable.addFeedback();
      self.instantFeedbackEvaluation();

      if (!self.params.behaviour.enableRetry || droppable.isCorrect()) {
        droppable.disableDropzoneAndContainedDraggable();
      }
    }

    this.trigger('drop', {
      element: draggable.getElement(),
      target: droppable.getElement()
    });

    this.trigger('resize');
    droppable.layout();

    // Resize seems to set focus to the iframe
    droppable.getElement().focus();
  };

  /**
   * Adds the draggable words to the provided container in random order.
   *
   * @param {jQuery} $container Container the draggables will be added to.
   *
   * @returns {H5P.TextDraggable[]}
   */
  ParsonsPuzzle.prototype.shuffleAndAddDraggables = function ($container) {
    return Util.shuffle(this.draggables)
      .map((draggable, index) => draggable.setIndex(index))
      .map(draggable => this.addDraggableToContainer($container, draggable))
      .map(draggable => this.setDraggableAriaLabel(draggable))
      .map(draggable => this.addDraggableToControls(this.dragControls, draggable));
  };

  /**
   * Sets an aria label numbering the draggables
   *
   * @param {H5P.TextDraggable} draggable
   *
   * @return {H5P.TextDraggable}
   */
  ParsonsPuzzle.prototype.setDraggableAriaLabel = function (draggable) {
    draggable.updateAriaLabel(this.params.ariaDraggableIndex
      .replace('@index', (draggable.getIndex() + 1).toString())
      .replace('@count', this.draggables.length.toString()));

    return draggable;
  };

  /**
   * Returns true if aria-grabbed="true" on an element
   *
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  ParsonsPuzzle.prototype.isGrabbed = function (element) {
    return element.getAttribute("aria-grabbed") === 'true';
  };

  /**
   * Adds the draggable to the container
   *
   * @param {jQuery} $container
   * @param {H5P.TextDraggable} draggable
   *
   * @returns {H5P.TextDraggable}
   */
  ParsonsPuzzle.prototype.addDraggableToContainer = function ($container, draggable) {
    draggable.getDraggableElement().addClass(CODE_LINE);
    draggable.appendDraggableTo($container);
    return draggable;
  };

  /**
   * Adds the element of Draggables to (keyboard) controls
   *
   * @param {H5P.Controls} controls
   * @param {H5P.TextDraggable} draggable
   *
   * @returns {H5P.TextDraggable}
   */
  ParsonsPuzzle.prototype.addDraggableToControls = function (controls, draggable) {
    controls.addElement(draggable.getElement());
    return draggable;
  };

  /**
   * Feedback function for checking if all fields are filled, and show evaluation if that is the case.
   */
  ParsonsPuzzle.prototype.instantFeedbackEvaluation = function () {
    var self = this;
    var allFilled = self.isAllAnswersFilled();

    if (allFilled) {
      //Shows "retry" and "show solution" buttons.
      if (self.params.behaviour.enableSolutionsButton) {
        self.showButton('show-solution');
      }
      if (self.params.behaviour.enableRetry) {
        self.showButton('try-again');
      }

      // Shows evaluation text
      self.showEvaluation(!self.instantFeedbackEvaluationFilled);
      self.instantFeedbackEvaluationFilled = true;
    } else {
      self.instantFeedbackEvaluationFilled = false;
      //Hides "retry" and "show solution" buttons.
      self.hideButton('try-again');
      self.hideButton('show-solution');

      //Hides evaluation text.
      self.hideEvaluation();
    }
  };

  /**
   * Check if all answers are filled
   *
   * @returns {boolean} allFilled Returns true if all answers are answered
   */
  ParsonsPuzzle.prototype.isAllAnswersFilled = function () {
    return this.draggables.every(function(draggable){
      return draggable.isInsideDropZone();
    });
  };

  /**
   * Enables all dropzones and all draggables.
   */
  ParsonsPuzzle.prototype.enableAllDropzonesAndDraggables = function () {
    this.enableDraggables();
    this.droppables.forEach(function (droppable) {
      droppable.enableDropzone();
    });
  };

  /**
   * Disables all draggables, user will not be able to interact with them any more.
   */
  ParsonsPuzzle.prototype.disableDraggables = function () {
    this.draggables.forEach(function (entry) {
      entry.disableDraggable();
    });
  };

  /**
   * Enables all draggables, user will be able to interact with them again.
   */
  ParsonsPuzzle.prototype.enableDraggables = function () {
    this.draggables.forEach(function (entry) {
      entry.enableDraggable();
    });
  };

  /**
   * Used for contracts.
   * Checks if the parent program can proceed. Always true.
   *
   * @returns {Boolean} true
   */
  ParsonsPuzzle.prototype.getAnswerGiven = function () {
    return this.answered;
  };

  /**
   * Used for contracts.
   * Checks the current score for this task.
   *
   * @returns {Number} The current score.
   */
  ParsonsPuzzle.prototype.getScore = function () {
    return this.calculateScore();
  };

  /**
   * Used for contracts.
   * Checks the maximum score for this task.
   *
   * @returns {Number} The maximum score.
   */
  ParsonsPuzzle.prototype.getMaxScore = function () {
    return this.droppables.length;
  };

  /**
   * Get title of task
   *
   * @returns {string} title
   */
  ParsonsPuzzle.prototype.getTitle = function () {
    return H5P.createTitle((this.contentData && this.contentData.metadata && this.contentData.metadata.title) ? this.contentData.metadata.title : 'Drag the Words');
  };

  /**
   * Toogles the drop effect based on if an element is selected
   */
  ParsonsPuzzle.prototype.toggleDropEffect = function () {
    var hasSelectedElement = this.selectedElement !== undefined;
    this.ariaDropControls[hasSelectedElement ? 'setAllToMove' : 'setAllToNone']();
  };

  /**
   * Returns the Draggable by element
   *
   * @param {HTMLElement} el
   *
   * @returns {H5P.TextDraggable}
   */
  ParsonsPuzzle.prototype.getDraggableByElement = function (el) {
    return this.draggables.filter(function(draggable){
      return draggable.$draggable.get(0) === el;
    }, this)[0];
  };

  /**
   * Returns the Droppable by element
   *
   * @param {HTMLElement} el
   *
   * @returns {H5P.TextDroppable}
   */
  ParsonsPuzzle.prototype.getDroppableByElement = function (el) {
    return this.droppables.filter(function(droppable){
      return droppable.$dropzone.get(0) === el;
    }, this)[0];
  };

  /**
   * Used for contracts.
   * Sets feedback on the dropzones.
   */
  ParsonsPuzzle.prototype.showSolutions = function () {
    this.showEvaluation(true);
    this.droppables.forEach(function (droppable) {
      droppable.addFeedback();
      droppable.showSolution();
    });

    this.removeAllDroppablesFromControls();
    this.disableDraggables();
    //Remove all buttons in "show solution" mode.
    this.hideButton('try-again');
    this.hideButton('show-solution');
    this.hideButton('check-answer');

    this.trigger('resize');
  };

  /**
   * Used for contracts.
   * Resets the complete task back to its' initial state.
   */
  ParsonsPuzzle.prototype.resetTask = function () {
    var self = this;
    // Reset task answer
    self.answered = false;
    self.instantFeedbackEvaluationFilled = false;
    //Reset draggables parameters and position
    self.resetDraggables();
    self.resetDroppables();
    //Hides solution text and re-enable draggables
    self.hideEvaluation();
    self.hideExplanation();
    self.enableAllDropzonesAndDraggables();
    //Show and hide buttons
    self.hideButton('try-again');
    self.hideButton('show-solution');

    if (!self.params.behaviour.instantFeedback) {
      self.showButton('check-answer');
    }
    self.hideAllSolutions();
    this.trigger('resize');
  };

  /**
   * Resets the position of all draggables shuffled.
   */
  ParsonsPuzzle.prototype.resetDraggables = function () {
    Util.shuffle(this.draggables).forEach(this.revert, this);
  };

  ParsonsPuzzle.prototype.resetDroppables = function () {
    this.droppables.forEach(function (droppable) {
      droppable.removeDraggable();
    });
  };

  /**
   * Returns an object containing the dropped words
   *
   * @returns {object} containing indexes of dropped words
   */
  ParsonsPuzzle.prototype.getCurrentState = function () {
    // Return undefined if task is not initialized
    if (this.draggables === undefined) {
      return undefined;
    }

    return this.draggables
      .filter(draggable => (draggable.getInsideDropzone() !== null))
      .map(draggable => ({
        draggable: draggable.getInitialIndex(),
        droppable: this.droppables.indexOf(draggable.getInsideDropzone())
      }));
  };

  /**
   * Sets answers to current user state
   */
  ParsonsPuzzle.prototype.setH5PUserState = function () {
    const self = this;

    // Do nothing if user state is undefined
    if (this.previousState === undefined) {
      return;
    }

    // Select words from user state
    this.previousState.forEach(indexes => {
      if (!self.isValidIndex(indexes.draggable) || !self.isValidIndex(indexes.droppable)) {
        throw new Error('Stored user state is invalid');
      }

      const moveDraggable = this.getDraggableByInitialIndex(indexes.draggable);
      const moveToDroppable = self.droppables[indexes.droppable];

      self.drop(moveDraggable, moveToDroppable);

      if (self.params.behaviour.instantFeedback) {
        // Add feedback to dropzone
        if (moveToDroppable !== null) {
          moveToDroppable.addFeedback();
        }

        // Add feedback to draggable
        if (moveToDroppable.isCorrect()) {
          moveToDroppable.disableDropzoneAndContainedDraggable();
        }
      }
    });

    // Show evaluation if task is finished
    if (self.params.behaviour.instantFeedback) {

      // Show buttons if not max score and all answers filled
      if (self.isAllAnswersFilled() && !self.showEvaluation()) {

        //Shows "retry" and "show solution" buttons.
        if (self.params.behaviour.enableSolutionsButton) {
          self.initShowShowSolutionButton = true;
        }
        if (self.params.behaviour.enableRetry) {
          self.initShowTryAgainButton = true;
        }
      }
    }
  };

  /**
   * Checks if a number is a valid index
   *
   * @param {number} index
   * @return {boolean}
   */
  ParsonsPuzzle.prototype.isValidIndex = function(index) {
    return !isNaN(index) && (index < this.draggables.length) && (index >= 0);
  };

  /**
   * Returns the draggable that initially was at an index
   *
   * @param {number} initialIndex
   * @return {Draggable}
   */
  ParsonsPuzzle.prototype.getDraggableByInitialIndex = function(initialIndex) {
    return this.draggables.filter(draggable => draggable.hasInitialIndex(initialIndex))[0];
  };

  /**
   * getXAPIData
   * Contract used by report rendering engine.
   *
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-6}
	 *
   * @returns {Object} xAPI data
   */
  ParsonsPuzzle.prototype.getXAPIData = function () {
    var xAPIEvent = this.createXAPIEventTemplate('answered');
    this.addQuestionToXAPI(xAPIEvent);
    this.addResponseToXAPI(xAPIEvent);
    return {
      statement: xAPIEvent.data.statement
    };
  };

  /**
   * addQuestionToXAPI
   * Add the question itself to the definition part of an xAPIEvent
   *
   * @param xAPIEvent
   */
  ParsonsPuzzle.prototype.addQuestionToXAPI = function (xAPIEvent) {
    var definition = xAPIEvent.getVerifiedStatementValue(['object','definition']);
    $.extend(definition, this.getxAPIDefinition());
  };

  /**
   * Generate xAPI object definition used in xAPI statements.
   *
   * @returns {Object}
   */
  ParsonsPuzzle.prototype.getxAPIDefinition = function () {
    var definition = {};
    definition.interactionType = 'fill-in';
    definition.type = 'http://adlnet.gov/expapi/activities/cmi.interaction';

    var question = this.codeBlockHtml;
    var puzzleInstructions = this.params.puzzleInstructions + '<br/>';

    // Create the description
    definition.description = {
      'en-US': puzzleInstructions + this.replaceSolutionsWithBlanks(question)
    };

    //Create the correct responses pattern
    definition.correctResponsesPattern = [this.getSolutionsFromQuestion(question)];

    return definition;
  };

  /**
   * Add the response part to an xAPI event
   *
   * @param {H5P.XAPIEvent} xAPIEvent
   *  The xAPI event we will add a response to
   */
  ParsonsPuzzle.prototype.addResponseToXAPI = function (xAPIEvent) {
    var self = this;
    var currentScore = self.getScore();
    var maxScore = self.droppables.length;
    var duration;

    xAPIEvent.setScoredResult(currentScore, maxScore, self);

    var score = {
      min: 0,
      raw: currentScore,
      max: maxScore,
      scaled: Math.round(currentScore / maxScore * 10000) / 10000
    };

    if(self.stopWatch) {
      duration = 'PT' + self.stopWatch.stop() + 'S';
    }

    xAPIEvent.data.statement.result = {
      response: self.getXAPIResponse(),
      score: score,
      duration: duration,
      completion: true
    };
  };

  /**
   * Generate xAPI user response, used in xAPI statements.
   *
   * @returns {string} User answers separated by the "[,]" pattern
   */
  ParsonsPuzzle.prototype.getXAPIResponse = function () {
     return this.droppables
      .map(droppable => droppable.hasDraggable() ? droppable.containedDraggable.text : '')
      .join('[,]');
  };

	/**
	 * replaceSolutionsWithBlanks
	 *
	 * @param {string} question
	 * @returns {string}
	 */
  ParsonsPuzzle.prototype.replaceSolutionsWithBlanks = function (question) {
    return parseText(question)
      .map(part => this.isAnswerPart(part) ? '__________' : part)
      .join('');
  };

	/**
	 * Get solutions from question
	 *
	 * @param {string} question
	 * @returns {string} Array with a string containing solutions of a question
	 */
  ParsonsPuzzle.prototype.getSolutionsFromQuestion = function (question) {
    return parseText(question)
      .filter(this.isAnswerPart)
      .map(part => lex(part))
      .map(solution => solution.text)
      .join('[,]');
  };

  return ParsonsPuzzle;

}(H5P.jQuery, H5P.Question, H5P.ConfirmationDialog));

/**
 * Static helper method to enable parsing of question text into a format useful
 * for generating reports.
 *
 * PS: The leading backslash for the correct and incorrect feedback within
 * answer parts must be escaped appropriately:
 *
 * Example:
 *
 * question: 'H5P content is *interactive\\+Correct! \\-Incorrect, try again!*.'
 *
 * produces the following:
 *
 * [
 *   {
 *     type: 'text',
 *     content: 'H5P content is '
 *   },
 *   {
 *     type: 'answer',
 *     correct: 'interactive'
 *   },
 *   {
 *     type: 'text',
 *     content: '.'
 *   }
 * ]
 *
 * @param {string} question Question text for an H5P.DragText content item
 */
H5P.ParsonsPuzzle.parseText = function (question) {
  const isAnswerPart = function (part) {
    return Util.startsWith('*', part) && Util.endsWith('*', part);
  };
  return parseText(question)
    .map(part => isAnswerPart(part) ?
      ({
        type: 'answer',
        correct: lex(part).text
      }) :
      ({
        type: 'text',
        content: part
      })
    );
};

export default H5P.ParsonsPuzzle;
