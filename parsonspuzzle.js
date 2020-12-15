var H5P = H5P || {};

H5P.ParsonsPuzzle = (function ($, ParsonsJS) {
  function displayErrors(fb) {
    console.log(fb);
    console.log("----------->")
    if (fb.errors.length > 0) {
      alert(fb.errors[0]);
    }
  }

    /**
     * StepByStepMath constructor
     * @param       {object} options Object with current data and configurations
     * @param       {integer} id      Unique identifier
     * @constructor
     */
     function ParsonsQuiz(options, id, data) {
        // Inheritance
        // Question.call(self, 'parsons');
        this.data = data;
        var defaults = {
          passPercentage: 50,
          texts: {
            finishButton: 'Finish'
          },
          endGame: {
            showResultPage: true,
            noResultMessage: 'Finished',
            message: 'Your result:',
            oldFeedback: {
              successGreeting: '',
              successComment: '',
              failGreeting: '',
              failComment: ''
            },
            overallFeedback: [],
            finishButtonText: 'Finish',
            solutionButtonText: 'Show solution'
          },
          override: {},
          disableBackwardsNavigation: false
        };
        this.options = $.extend(true, {}, defaults, options); // defined in semantics.json
        this.parsonList = [];
        this.id = id;
        // this.quiz = this.options.quiz;
        this.$startQ = $('<button/>', { 'class': "startQuiz", 'text': "	Start Quiz ?" });
        this.$inner = $('<div/>', {
          class: "h5p-inner"
        });
        // this.$endQ = $('<button/>', { 'class': "endQuiz", 'text': "submit Quiz " });

        //score create
        this.score = 0;
        this.Maxscore = 0;

        /* this is the part for get random question to the student */
        this.questionInstances = [];
        this.questionOrder; //Stores order of questions to allow resuming of question set

        this.finals;
        this.totals;
        this.scoreString = "";
        this.success;
        this.scoreBar;
        this.addTemplate();
      }
      /**add templates  */
      ParsonsQuiz.prototype.addTemplate = function () {
        var resulttemplate =
        '<div class="questionset-results">' +
        '  <div class="greeting"><%= message %></div>' +
        '  <div class="feedback-section">' +
        '    <div class="feedback-scorebar"></div>' +
        '    <div class="feedback-text"></div>' +
        '  </div>' +
        '  <% if (comment) { %>' +
        '  <div class="result-header"><%= comment %></div>' +
        '  <% } %>' +
        '  <% if (resulttext) { %>' +
        '  <div class="result-text"><%= resulttext %></div>' +
        '  <% } %>' +
        '</div>';
        this.endTemplate = new EJS({ text: resulttemplate });
      }

    /**
     * Randomizes questions in an array and updates an array containing their order
     * @param  {array} problems
     * @return {Object.<array, array>} questionOrdering
     */
     ParsonsQuiz.prototype.randomizeQuestionOrdering = function (questions) {

        // Save the original order of the questions in a multidimensional array [[question0,0],[question1,1]...
        var questionOrdering = questions.map(function (questionInstance, index) {
          return [questionInstance, index];
        });

        // Shuffle the multidimensional array
        questionOrdering = H5P.shuffleArray(questionOrdering);

        // Retrieve question objects from the first index
        questions = [];
        for (var i = 0; i < questionOrdering.length; i++) {
          questions[i] = questionOrdering[i][0];
        }

        // Retrieve the new shuffled order from the second index
        var newOrder = [];
        for (var j = 0; j < questionOrdering.length; j++) {

            // Use a previous order if it exists
            if (this.data.previousState && this.data.previousState.questionOrder) {
              newOrder[j] = questionOrder[questionOrdering[j][1]];
            } else {
              newOrder[j] = questionOrdering[j][1];
            }
          }

        // Return the questions in their new order *with* their new indexes
        return {
          questions: questions,
          questionOrder: newOrder
        };
      };
    /**
     * Creates and fills container with content
     * @param  {object} $container Container node
     * @return {void}
     */

     ParsonsQuiz.prototype.attach = function ($container) {
      var self = this;

        // set container
        self.$container = $container;
        $container.addClass('h5p-parsons');
        self.$inner.appendTo($container);
        self.$startQ.appendTo($container);
        /** add start timmer */
        self.$inner.hide();
        var startTotal;
        var finishTotal;
        $(".startQuiz").click(function () {
          self.$startQ.hide();
          self.$inner.show();
          startTotal = new Date();
          console.log(startTotal);
        });

        /**end timer */


        /** start shuffle question order */
        // Bring question set up to date when resuming
        if (this.data.previousState) {
          if (this.data.previousState.progress) {
            currentQuestion = this.data.previousState.progress;
          }
          questionOrder = this.data.previousState.order;
        }

        // Create a pool (a subset) of questions if necessary
        if (this.options.poolSize > 0) {

            // If a previous pool exists, recreate it
            if (this.data.previousState && this.data.previousState.poolOrder) {
              poolOrder = this.data.previousState.poolOrder;

                // Recreate the pool from the saved data
                var pool = [];
                for (var i = 0; i < poolOrder.length; i++) {
                  pool[i] = this.options.quiz[poolOrder[i]];
                  this.questionInstances.push(pool[i]);
                }
                // Replace original questions with just the ones in the pool
                this.options.quiz = pool;

            } else { // Otherwise create a new pool
                // Randomize and get the results
                var poolResult = this.randomizeQuestionOrdering(this.options.quiz);
                var poolQuestions = poolResult.questions;
                poolOrder = poolResult.questionOrder;

                // Discard extra questions

                poolQuestions = poolQuestions.slice(0, this.options.poolSize);
                poolOrder = poolOrder.slice(0, this.options.poolSize);
                // Replace original questions with just the ones in the pool
                this.options.quiz = poolQuestions;

              }

            }
        // add quiz title and description
        $('<div/>', { "text": this.data.metadata.title, "id": "title" }).appendTo(self.$inner);
        $('<p/>', { html: this.options.assignmentDescription, "id": "taskDescription" }).appendTo(self.$inner);

        // add each question to quiz
        for (let i = 0; i < this.options.quiz.length; i++) {
          var problem = this.options.quiz[i];
          var parsonsjs = new ParsonsJS(i);
            // add each question's container
            self.$inner.append(parsonsjs.$question);

            // create a new parson question
            var problem_title = problem.problem_title;
            var problem_description = problem.problem_description;
            var problemIndex = i;

            // add meta data of the question

            var template =
            '<h2 class="problemTitle"><%= title %></h2>' +
            '<p class="problemDescription"><%= problemDescription %></p>' +
            '<p class="codeLanguage" id="language-<%= index %>">' +
            '    <i class="fas fa-globe-asia"> language: </i>' +
            '    <%= codeLanguage %> ' +
            '</p>' +
            '<div class="sortable-code" id="sortableTrash"> </div>' +
            '<div class="sortable-code" id="sortable"> </div>' +
            '<div style="clear:both;"></div>' +
            '' +
            '<div class="actions">' +
            '    <button type="button" role="button" class="h5p-joubelui-button newInstance" id="newInstanceLink-<%= index %>"><%= button1Title %></button>' +
            '    <button type="button" role="button" class="h5p-joubelui-button feedback" id="feedbackLink-<%= index %>"><%= button2Title %></button>' +
            '</div>' +
            '<div class="actions" style="margin-top: 70px;">' +
            '    <button type="button" role="button" class="h5p-joubelui-button submit endQuiz" id="submitLink-<%= index %>"><%= buttonSubmit %></buttona>' +
            '</div>';

            var ejs_template = new EJS({ text: template });
            let html = ejs_template.render({
              title: "Question " + problemIndex + ": " + problem_title,
              problemDescription: problem_description,
              index: problemIndex,
              codeLanguage: problem.code.code_language,
              button1Title: "New instance",
              button2Title: "Get feedback",
              buttonSubmit: "Submit",
            });
            console.log(html);
            $(html).appendTo(parsonsjs.$question);


            //
            // question content

            var code_line = problem.code.code_block;
            self.Maxscore += 1;
            if (problem.fill_in_blank) {
                //testcase 1 edition
                var vars_string1 = problem.test_cases.testcase1.variables;
                var vars_array1 = vars_string1.split(' ');

                var final1 = {};
                for (var k = 0; k < vars_array1.length; k++) {
                  var var_array = vars_array1[k].split(':');
                  var var_name = var_array[0];
                  var var_value = var_array[1];
                  if (parseInt(var_value) != NaN) {
                    var_value = parseInt(var_value);
                  }
                  final1[var_name] = var_value;
                }
                //testcase 2 edition
                var vars_string2 = problem.test_cases.testcase2.variables;
                var vars_array2 = vars_string2.split(' ');

                var final2 = {};
                for (var k = 0; k < vars_array2.length; k++) {
                  var var_array = vars_array2[k].split(':');
                  var var_name = var_array[0];
                  var var_value = var_array[1];
                  if (parseInt(var_value) != NaN) {
                    var_value = parseInt(var_value);
                  }
                  final2[var_name] = var_value;
                }
              }
              var final_param = {};
              var default_setting = {
                'sortableId': 'sortable',
                'trashId': 'sortableTrash',
                'max_wrong_lines': 1,
                'programmingLang': "pseudo"
              };
              if (problem.fill_in_blank) {
                var fill = {
                  'vartests': [{
                    initcode: problem.test_cases.testcase1.initcode,
                    code: "",
                    message: problem.test_cases.testcase1.message,
                    variables: final1
                  },
                  {
                    initcode: problem.test_cases.testcase2.initcode,
                    code: "",
                    message: problem.test_cases.testcase2.message,
                    variables: final2
                  }
                  ],
                  'grader': ParsonsJS.ParsonsWidget._graders.LanguageTranslationGrader,
                  'executable_code': problem.code.test,
                  'feedback_cb': displayErrors

                };
              } else {
                var normal = { 'feedback_cb': displayErrors };
              }
              if (problem.fill_in_blank) {
                final_param = $.extend({}, default_setting, fill);
              } else {
                final_param = $.extend({}, default_setting, normal);
              }

              var parson = new ParsonsJS.ParsonsWidget(final_param, i)
              self.parsonList.push(parson);

              parson.init(code_line);
              parson.shuffleLines();

            // newInstance and feedback buttons
            $("<div/>", { "style": "clear:both;" }).appendTo(parsonsjs.$question);
            $("<div/>", { "css": "clear:both;" }).appendTo(parsonsjs.$question);
            $('<div/>', { "id": "unittest-" + i }).appendTo(parsonsjs.$question);
          }
          $(".newInstance").on('click', function (event) {
            var currentId = $(this).attr('id');
            var currentIndex = currentId.substr(currentId.length - 1);
            event.preventDefault();
            self.parsonList[currentIndex].shuffleLines();
          });
          $(".feedback").on('click', function (event) {
            var currentId = $(this).attr('id');
            var currentIndex = currentId.substr(currentId.length - 1);
            console.log("feedback : " + currentIndex + "is ongoing");
            event.preventDefault();
            var fb = self.parsonList[currentIndex].getFeedback();
            console.log(fb.html);
            $("#question-" + currentIndex).find("#unittest-" + currentIndex).html(fb.feedback);
            if (self.parsonList[currentIndex].correct == true) {
              self.score += 1;
            }
            if (fb.success) { alert("Good, you solved this question!"); }
          });
        //submit button to submit the quiz form
        // self.$endQ.appendTo(self.$inner);
        $(".endQuiz").click(function () {
          finishTotal = new Date() - startTotal;
          /**attach result page */
            // Trigger finished event.
            self.finals = self.score;
            self.totals = self.Maxscore;
            self.success = ((100 * self.finals / self.totals) >= self.options.passPercentage);

            self.scoreString = H5P.Question.determineOverallFeedback(self.options.endGame.overallFeedback, self.finals / self.totals);

            self.displayResults();
            self.trigger('resize');
            /**end attach result page */
          });
        /**start display result setting */
        self.displayResults = function () {
          this.triggerXAPICompleted(this.finals, this.totals, this.success);

          var eparams = {
            message: this.options.endGame.showResultPage ? this.options.endGame.message : this.options.endGame.noResultMessage,
            comment: this.options.endGame.showResultPage ? (this.success ? this.options.endGame.oldFeedback.successGreeting : this.options.endGame.oldFeedback.failGreeting) : undefined,
            resulttext: this.options.endGame.showResultPage ? (this.success ? this.options.endGame.oldFeedback.successComment : this.options.endGame.oldFeedback.failComment) : undefined,
            finishButtonText: this.options.endGame.finishButtonText,
          };

            // Show result page.
            this.$container.children().hide();
            this.$container.append(this.endTemplate.render(eparams));

            if (this.options.endGame.showResultPage) {
              scoreBar = this.scoreBar;
              if (scoreBar === undefined) {
                scoreBar = H5P.JoubelUI.createScoreBar(this.totals);
              }
              scoreBar.appendTo($('.feedback-scorebar', this.$container));
              $('.feedback-text', this.$container).html(this.scoreString);

                // Announce that the question set is complete
                setTimeout(function () {
                  console.log(self.totals);
                  console.log(self.finals);
                  $('.qs-progress-announcer', this.$container)
                  .html(eparams.message + '.' +
                    this.scoreString + '.' +
                    eparams.comment + '.' +
                    eparams.resulttext)
                  .show().focus();
                  scoreBar.setMaxScore(self.totals);
                  scoreBar.setScore(self.finals);
                }, 0);
              } else {
                // Remove buttons and feedback section
                $('.feedback-section', this.$container).remove();
              }

              this.trigger('resize');
            };
            /**end display result setting */

          }



          return ParsonsQuiz;

        })(H5P.jQuery, H5P.ParsonsJS);