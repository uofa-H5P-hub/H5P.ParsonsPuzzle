var H5P = H5P || {};

/**
     * @class H5P.ParsonsPuzzle
     * @param       {Object} options  Object with current data and configurations
     * @param       {integer} id      Unique identifier
     * @param       {Ojbject} data    Task data
     *
     * @returns {Object} ParsonsPuzzle instance of a ParsonsPuzzle
     */
     H5P.ParsonsPuzzle = function (options, id) {


       var $ = H5P.jQuery;
       var self = this;

       if (!(this instanceof H5P.ParsonsPuzzle)) {
        return new H5P.ParsonsPuzzle(options, id);
      }

      self.id = id;

      var defaults = {
        overallFeedback: [],
      },
      disableBackwardsNavigation: false
    };

        self.options = $.extend(true, {}, defaults, options); // defined in semantics.json


        //score create
        self.score = 0;
        self.finals;
        self.totals;
        self.scoreString = "";
        self.success;
        self.scoreBar;
  
        self.createResultTemplate();
      }


      /**add templates  */
      ParsonsQuiz.prototype.createResultTemplate = function () {
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
        self.endTemplate = new EJS({ text: resulttemplate });
      }


    /**
     * Creates and fills container with content
     * @param  {object} $container Container node
     * @return {void}
     */

     ParsonsQuiz.prototype.attach = function ($container) {

        // set container
        self.$container = $container;
        $container.addClass('h5p-parsons');

        // add quiz title and description
        $('<div/>', { class: "h5p-inner", "text": self.data.metadata.title, "id": "title" }).appendTo($container);

           // add meta data of the question
           var template =
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
           '    <button type="button" role="button" class="h5p-joubelui-button submit endQuiz" id="submitLink-<%= index %>"><%= buttonSubmit %></button>' +
           ' <% if (problem.code.enableRetryButton) { %> ' +
                  '<button type="button" role="button" class="h5p-joubelui-button newInstance" id="newInstanceLink-<%= index %>"><%= button1Title %></button>' +
            '  <% } %> ' +
             ' <% if (problem.code.enableSolutionButton) { %> ' +
           '    <button type="button" role="button" class="h5p-joubelui-button feedback" id="feedbackLink-<%= index %>"><%= button2Title %></button>' +
            '  <% } %> ' +
           '</div>' 

           var ejs_template = new EJS({ text: template });
           let html = ejs_template.render({
            problemDescription: puzzleInstructions,
            codeLanguage: problem.code.code_language,
            button1Title: problem.code.tryAgain,
            button2Title: problem.code.solutionButtonText,
            buttonSubmit: problem.code.checkAnswer,
          });
           console.log(html);
           $(html).appendTo(parsonsjs.$question);


            //
            // question content

            var code_line = problem.code.code_block;
            var final_param = {};
            var default_setting = {
              'sortableId': 'sortable',
              'trashId': 'sortableTrash',
            };
            var normal = { 'feedback_cb': displayErrors };

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
            var currentId = $(self).attr('id');
            var currentIndex = currentId.substr(currentId.length - 1);
            event.preventDefault();
            self.parsonList[currentIndex].shuffleLines();
          });
          $(".feedback").on('click', function (event) {
            var currentId = $(self).attr('id');
            var currentIndex = currentId.substr(currentId.length - 1);
            console.log("feedback : " + currentIndex + "is ongoing");
            event.preventDefault();
            var fb = self.parsonList[currentIndex].getFeedback();
            console.log(fb.html);
            $("#question-" + currentIndex).find("#unittest-" + currentIndex).html(fb.feedback);
            if (self.parsonList[currentIndex].correct == true) {
              self.score += 1;
            }
          });
        //submit button to submit the quiz form
        // self.$endQ.appendTo(self.$inner);
        $(".endQuiz").click(function () {
          /**attach result page */
            // Trigger finished event.
            self.finals = self.score;
            self.scoreString = H5P.Question.determineOverallFeedback(self.options.endGame.overallFeedback, self.finals / self.totals);

            self.displayResults();
            self.trigger('resize');
            /**end attach result page */
          });
        /**start display result setting */
        self.displayResults = function () {
          self.triggerXAPICompleted(self.finals, self.totals, self.success);

          var eparams = {
            message: self.options.endGame.showResultPage ? self.options.endGame.message : self.options.endGame.noResultMessage,
            comment: self.options.endGame.showResultPage ? (self.success ? self.options.endGame.oldFeedback.successGreeting : self.options.endGame.oldFeedback.failGreeting) : undefined,
            resulttext: self.options.endGame.showResultPage ? (self.success ? self.options.endGame.oldFeedback.successComment : self.options.endGame.oldFeedback.failComment) : undefined,
            finishButtonText: self.options.endGame.finishButtonText,
          };

            // Show result page.
            self.$container.append(self.endTemplate.render(eparams));
              scoreBar = self.scoreBar;
              if (scoreBar === undefined) {
                scoreBar = H5P.JoubelUI.createScoreBar(self.totals);
              }
              scoreBar.appendTo($('.feedback-scorebar', self.$container));
              $('.feedback-text', self.$container).html(self.scoreString);


              self.trigger('resize');
            };
            /**end display result setting */

          }

          return ParsonsQuiz;

        })(H5P.jQuery, H5P.ParsonsJS);