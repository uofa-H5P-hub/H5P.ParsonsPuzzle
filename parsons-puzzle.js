var H5P = H5P || {};

H5P.ParsonsPuzzle = (function ($, ParsonsJS) {

    /**
     * @class H5P.ParsonsPuzzle
     * @param       {Object} options  Object with current data and configurations
     * @param       {integer} id      Unique identifier
     * @param       {Ojbject} data    Task data
     *
     * @returns {Object} ParsonsPuzzle instance of a ParsonsPuzzle
     */
     function ParsonsPuzzle(options, id, data) {
        this.$ = $(this);
        this.id = id;
        this.data = data;

        var defaults = {
          passPercentage: 50,

            overallFeedback: [],
            finishButtonText: 'Finish',
            solutionButtonText: 'Show solution'
          },
          override: {},
          disableBackwardsNavigation: false
        };

        this.options = $.extend(true, {}, defaults, options); // defined in semantics.json
        // this.quiz = this.options.quiz;
        this.$startQ = $('<button/>', { 'class': "startQuiz", 'text': "	Start Quiz ?" });
        this.$inner = $('<div/>', {
          class: "h5p-inner"
        });
        // this.$endQ = $('<button/>', { 'class': "endQuiz", 'text': "submit Quiz " });

        //score create
        this.score = 0;
        this.Maxscore = 0;
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
     * Creates and fills container with content
     * @param  {object} $container Container node
     * @return {void}
     */

     ParsonsQuiz.prototype.attach = function ($container) {

        // set container
        this.$container = $container;
        $container.addClass('h5p-parsons');
        this.$inner.appendTo($container);

        // add quiz title and description
        $('<div/>', { "text": this.data.metadata.title, "id": "title" }).appendTo(this.$inner);

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
            '    <button type="button" role="button" class="h5p-joubelui-button newInstance" id="newInstanceLink-<%= index %>"><%= button1Title %></button>' +
            '    <button type="button" role="button" class="h5p-joubelui-button feedback" id="feedbackLink-<%= index %>"><%= button2Title %></button>' +
            '</div>' +
            '<div class="actions" style="margin-top: 70px;">' +
            '    <button type="button" role="button" class="h5p-joubelui-button submit endQuiz" id="submitLink-<%= index %>"><%= buttonSubmit %></buttona>' +
            '</div>';

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


              this.trigger('resize');
            };
            /**end display result setting */

          }

          return ParsonsQuiz;

        })(H5P.jQuery, H5P.ParsonsJS);