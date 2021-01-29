var UofAParsons = UofAParsons || {};

/**
  * UofAParsons.CodeLine module
  */
UofAParsons.CodeLine = (function () {


  /**
   * Initialize module.
   *
   * @class UofAParsons.CodeLine
   *
   * @param {string} codeString text of code line
   * @param {Number} lineNo the location of this line in the code
   * @param {Number} defaultIndentation the number of spaces used for indentation
   *
   * @returns {Object} CodeLine Code Line instance
   */

  var CodeLine = function(codeString, lineNo, defaultIndentation) {
    const trimRegexp = /^\s*(.*?)\s*$/;

    this.code = "";
    this.indent = 0;
    this.lineNo = lineNo;
    this.distractor = false;
    this.defaultIndentation = 4;
    if (defaultIndentation) {
      this.defaultIndentation = defaultIndentation;
    }
    if (codeString) {

      // determine the level of indentation of this code line
      this.indent = parseInt((codeString.length - codeString.replace(/^\s+/, "").length)/this.defaultIndentation);

      // determine if this line is a distractor
      if (codeString.search(/#distractor\s*$/) >= 0) {
        this.distractor = true;
        this.indent = -1;
      }

      // remove indentation, leading/trailing spaces and markup from code
      this.code = codeString.replace(/#distractor\s*$/, "").replace(trimRegexp, "$1").replace(/\\n/g, "\n");
    }
  };

  /**
    * Add in spaces for indentation for display
    *
    * @returns {string} HTML representation of code with indentation
    */
  CodeLine.prototype.htmlIndent = function() {
    var tmp = "";
    for (let i = 0; i < this.indent * this.defaultIndentation; i++) {
      tmp += "&nbsp;"
    }
    return tmp + this.code;
  }

  CodeLine.prototype.clone = function() {
    var cl = new CodeLine(this.code);
    cl.indent = this.indent;
    cl.lineNo = this.lineNo;
    cl.distractor = this.distractor;
    cl.defaultIndentation = this.defaultIndentation;
    return cl;
  };
  return CodeLine;
})();

export default UofAParsons.CodeLine;
