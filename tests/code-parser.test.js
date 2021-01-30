import test from 'ava';
var H5P = {};
H5P.jQuery = {};
import CodeParser from '../src/scripts/code-parser';

var assertCodesEqual = function(t, code1, code2) {
  debugger
  t.deepEqual(code1.length, code2.length);
  for (var i=0; i<code1.length; i++) {
    t.deepEqual(code1[i].code, code2[i].code, code1[i].code + ' code of line ' + i );
    t.deepEqual(code1[i].indent, code2[i].indent, code1[i].code + ' indentation of line ' + i);
  }
};
test('Parser should parse middle', t => {
  const parser = new CodeParser(2);
  var initial =
    'def traverse_in_order(binary_node):\n' +
    '  if binary_node:\n' +
    '  if not binary_node: #distractor\n' +
    '    foo\n' +
    '  foo-1\n';
  const res = parser.parse(initial);
  assertCodesEqual(t,res.solutions, [{'code': 'def traverse_in_order(binary_node):', 'indent':0},
    {'code': 'if binary_node:', 'indent':0},
    {'code': 'foo', 'indent':1},
    {'code': 'foo-1', 'indent':0}], 'model solution'
  );

  assertCodesEqual(t, res.distractors, 
    [{'code': 'if not binary_node:', 'indent':-1}], 'distractors'
  );

  //distractors are moved to the end
  assertCodesEqual(t, res.codeLines, [
    {'code': 'def traverse_in_order(binary_node):', 'indent':0},
    {'code': 'if binary_node:', 'indent':0},
    {'code': 'foo', 'indent':1},
    {'code': 'foo-1', 'indent':0},
    {'code': 'if not binary_node:', 'indent':-1}]
  );
});
