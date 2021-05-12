import CodeLine from './code-line';

class CodeParser {

  constructor(maxDistractors) {
    this.maxDistractors = maxDistractors;
  }

  /**
   * Parse given code into separate lines
   *
   * @param {string} codeString The solution code
   * @param {number} the number of spaces in code indent
   *
   */
  parse(codeString, defaultIndentation) {
    var distractors = [],
      indented = [],
      codeLines = [],
      lineObject,
      errors = [],
      lines = codeString.split("\n");

    // process each code line and put in indented (normal) or distractor lists
    lines.forEach(function(item, index) {
      lineObject = new CodeLine(item, index - distractors.length, defaultIndentation);

      if (item.search(/#distractor\s*$/) >= 0) {
        // This line is a distractor
        lineObject.indent = -1;
        lineObject.distractor = true;
        if (lineObject.code.length > 0) {
          distractors.push(lineObject);
        }
      } else {
        // not a distractor
        if (lineObject.code.length > 0) {
          lineObject.distractor = false;
          indented.push(lineObject);
        }
      }
    });

    // remove extra indentations of blocks 
    var normalized = this.normalizeIndents(indented);
    normalized.forEach(function(item) {
      if (item.indent < 0) {
        // Indentation error
        errors.push(this.translations.no_matching(normalized.lineNo));
      }
      codeLines.push(item);
    });

    // Remove extra distractors if there are more alternative distrators
    // than should be shown at a time
    var permutation = this.getRandomPermutation(distractors.length);
    var selectedDistractors = [];
    var count = distractors.length > this.maxDistractors ? this.maxDistractors : distractors.length;
    for (var i = 0; i < count; i++) {
      selectedDistractors.push(distractors[permutation[i]]);
      codeLines.push(distractors[permutation[i]]);
    }

    /*
    var modifiedLines = [];
    codeLines.forEach(function( item ){
      var cl = item.clone();
    //  cl.indent = 0;
      modifiedLines.push(cl);
    });
    */

    return {
      // an array of line objects specifying  the solution
      solutions:  normalized,
      // an array of line objects specifying the requested number
      // of distractors (not all possible alternatives)
      distractors: selectedDistractors,
      // an array of line objects specifying the initial code arrangement
      // given to the user to use in constructing the solution
      codeLines: codeLines,
      errors: errors
    };
  }

  getRandomPermutation(n) {
    var permutation = [];
    var i;
    for (i = 0; i < n; i++) {
      permutation.push(i);
    }
    var swap1, swap2, tmp;
    for (i = 0; i < n; i++) {
      swap1 = Math.floor(Math.random() * n);
      swap2 = Math.floor(Math.random() * n);
      tmp = permutation[swap1];
      permutation[swap1] = permutation[swap2];
      permutation[swap2] = tmp;
    }
    return permutation;
  }

  /**
   * Normalise indentatations by removing extra indentations on matching
   * blocks - ie if all lines in a block are indented two levels from 
   * containing block rather than 1 - change all indents to one level from
   * containing block.
   *
   * @param {codeLine} Array of code lines to normalise indents
   *
   * @returns {codeLine} array of normalised code lines 
   * indent fields' values may be different from the argument. 
   * If indentation does not match, i.e. code is malformed, value of indent may be -1.
   * For example, the first line may not be indented.
   *
   **/
  normalizeIndents(lines) {

    var normalized = [];
    var newLine;

    // returns level of indent for matching line or -1 if none matching
    var matchIndent = function(index) {
      //return line index from the previous lines with matching indentation
      for (var i = index-1; i >= 0; i--) {
        if (lines[i].indent == lines[index].indent) {
          return normalized[i].indent;
        }
      }
      return -1;
    };

    for ( var i = 0; i < lines.length; i++ ) {
      //create shallow copy from the line object
      newLine = lines[i].clone();
      if (i === 0) {
        newLine.indent = 0;
        if (lines[i].indent !== 0) {
          newLine.indent = -1;
        }
      } else if (lines[i].indent == lines[i-1].indent) {
        newLine.indent = normalized[i-1].indent;
      } else if (lines[i].indent > lines[i-1].indent) {
        newLine.indent = normalized[i-1].indent + 1;
      } else {
        // indentation can be -1 if no matching indentation exists, i.e. IndentationError in Python
        newLine.indent = matchIndent(i);
      }
      normalized[i] = newLine;
    }
    return normalized;
  }
};

export default CodeParser;
