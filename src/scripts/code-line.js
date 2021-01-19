var UofAParsons = UofAParsons || {};
UofAParsons.CodeLine = (function () {
  // Create a line object skeleton with only code and indentation from
  // a code string of an assignment definition string (see parseCode)
  var CodeLine = function(codeString, lineNo, defaultIndentation) {
    const trimRegexp = /^\s*(.*?)\s*$/;

    this.code = "";
    this.indent = 0;
    this.lineNo = lineNo;
    this.distractor = false;
    if (codeString) {
      // Consecutive lines to be dragged as a single block of code have strings "\\n" to
      // represent newlines => replace them with actual new line characters "\n"
      this.code = codeString.replace(/#distractor\s*$/, "").replace(trimRegexp, "$1").replace(/\\n/g, "\n");
      this.indent = parseInt((codeString.length - codeString.replace(/^\s+/, "").length)/defaultIndentation);
      console.log("indenting of "+ codeString);
      console.log(this.indent);
      if (codeString.search(/#distractor\s*$/) >= 0) {
        this.distractor = true;
      }
    }
    this.defaultIndentation = defaultIndentation;
  };

  CodeLine.prototype.clone = function() {
    var cl = new CodeLine(this.code);
    cl.indent = this.indent;
    cl.lineNo = this.lineNo;
    cl.distractor = this.distractor;
    return cl;
  };
  return CodeLine;
})();

export default UofAParsons.CodeLine;
