var UofAParsons = UofAParsons || {};
UofAParsons.CodeLine = (function () {
  // Create a line object skeleton with only code and indentation from
  // a code string of an assignment definition string (see parseCode)
  var CodeLine = function(codeString) {
    const trimRegexp = /^\s*(.*?)\s*$/;

    this.code = "";
    this.indent = 0;
    this.orig   = -1;
    this.distractor = false;
    if (codeString) {
      // Consecutive lines to be dragged as a single block of code have strings "\\n" to
      // represent newlines => replace them with actual new line characters "\n"
      this.code = codeString.replace(/#distractor\s*$/, "").replace(trimRegexp, "$1").replace(/\\n/g, "\n");
      this.indent = codeString.length - codeString.replace(/^\s+/, "").length;
      if (codeString.search(/#distractor\s*$/) >= 0) {
        this.distractor = true;
      }
    }
  };

  CodeLine.prototype.clone = function() {
    var cl = new CodeLine(this.code);
    cl.indent = this.indent;
    cl.orig = this.orig;
    cl.distractor = this.distractor;
    return cl;
  };
  return CodeLine;
})();

export default UofAParsons.CodeLine;
