/*
 *	derived from mysql mode
 */
var syntax = function(bypass) {
    return function (config) {
        var indentUnit = config.indentUnit;
        var curPunc;

        function wordRegexp(opts, words) {
            return new RegExp("^(?:" + words.join("|") + ")$", opts);
        }

        var ops = wordRegexp("i", [
            ('ms|milli(second)?s?'),
            ('sec(ond)?s?'),
            ('min(ute)?s?'),
            ('hours?'),
            ('days?'),
            ('wks?|weeks?'),
            ('months?|weeks?'),
            ('bimester'),
            ('trimester'),
            ('quarter'),
            ('semester'),
            ('yrs?|years?')
        ]);

        var ops2 = wordRegexp("i", [
            ('mon(day)?'),
            ('tue(sday)?'),
            ('wed(nesday)?'),
            ('thu(rsday)?'),
            ('fri(day)?'),
            ('sat(urday)?'),
            ('sun(day)?'),
            ('jan(uary)?'),
            ('feb(ruary)?'),
            ('mar(ch)?'),
            ('apr(il)?'),
            ('may'),
            ('jun(e)?'),
            ('jul(y)?'),
            ('aug(ust)?'),
            ('sep(tember)?'),
            ('oct(ober)?'),
            ('nov(ember)?'),
            ('dec(ember)?'),
            ('today'),
            ('yester([^\\s]+)'),
            ('now'),
            ('none')
        ]);

        var nmbr = wordRegexp("i", [
            ('(["\\n\\t\\r\\-\\/_.\\:\\+"]*\\d)*(am|pm|nd|rd|th)?'),
            ('am|pm|first')
        ]);

        var keywords = wordRegexp("" , [
            ('timestamp'),
            ('ts'),
            ('shifted'),
            ('from'),
            ('extend'),
            ('left'),
            ('right'),
            ('to'),
            ('by'),
            ('until'),
            ('=>'),
            ('of'),
            ('st|nd|rd|th'),
            ('current'),
            ('this'),
            ('previous'),
            ('yester'),
            ('yester\w+'),
            ('before'),
            ('after'),
            ('since'),
            (','),
            ('the'),
            ('a'),
            ('now'),
            ('none'),
            ('today'),
            ('ago'),
            ('and'),
            ('last'),
            ('first')
        ]);

        function tokenBase(stream, state) {
            var ch = stream.next();
            curPunc = null;

            if (state.inside_def) {
                if (ch != '>') {
                    stream.eatWhile(/[_\w\d\.]/);
                    if (stream.peek() == '>')
                        return "variable"; 
                    else
                        return "comment";
                } else {
                    state.inside_def = false;
                    return "comment";
                }
            }

            if (bypass && ch == '<' && stream.peek().match(/[_\w\d\.]/)) {
                stream.eatWhile(/[_\w\d\.]/);
                state.inside_def = true;
                return "comment";
            } else if (ch.match(/[%]/)) {
                return "keyword";
            } else if (ch == "-") {
                ch2 = stream.peek();
                if (ch2 == "-") {
                    stream.skipToEnd();
                    return "comment";
                } else {
                    return "keyword";
                }

            } else {
                stream.eatWhile(/[_\w\d\.]/);
                var word = stream.current();
                var last = state.last;

                state.last = word;
                if (ops.test(word)) {
                    return "number";
                } if (ops2.test(word)) {
                    return "variable-2";
                } if (nmbr.test(word)) {
                    return "keyword";
                } else if (keywords.test(word)) {
                    return "variable";
                } else if (stream.peek() == "(")
                    return "variable-2";
                else {
                    if (!isNaN(word))
                        state.last = last;
                    return "variable";
                }
            }
        }

        function tokenLiteral(quote) {
            return function (stream, state) {
                var escaped = false, ch;
                while ((ch = stream.next()) != null) {
                    if (ch == quote && !escaped) {
                        state.tokenize = tokenBase;
                        break;
                    }
                    escaped = !escaped && ch == "\\";
                }
                return "string";
            };
        }

        function tokenOpLiteral(quote) {
            return function (stream, state) {
                var escaped = false, ch;
                while ((ch = stream.next()) != null) {
                    if (ch == quote && !escaped) {
                        state.tokenize = tokenBase;
                        break;
                    }
                    escaped = !escaped && ch == "\\";
                }
                return "variable-2";
            };
        }


        function pushContext(state, type, col) {
            state.context = {prev:state.context, indent:state.indent, col:col, type:type};
        }

        function popContext(state) {
            state.indent = state.context.indent;
            state.context = state.context.prev;
        }

        return {
            startState:function (base) {
                return {tokenize:tokenBase,
                    context:null,
                    indent:0,
                    col:0};
            },

            token:function (stream, state) {
                if (stream.sol()) {
                    if (state.context && state.context.align == null) state.context.align = false;
                    state.indent = stream.indentation();
                }
                if (stream.eatSpace()) return null;
                var style = state.tokenize(stream, state);

                if (style != "comment" && state.context && state.context.align == null && state.context.type != "pattern") {
                    state.context.align = true;
                }

                if (curPunc == "(") pushContext(state, ")", stream.column());
                else if (curPunc == "[") pushContext(state, "]", stream.column());
                else if (curPunc == "{") pushContext(state, "}", stream.column());
                else if (/[\]\}\)]/.test(curPunc)) {
                    while (state.context && state.context.type == "pattern") popContext(state);
                    if (state.context && curPunc == state.context.type) popContext(state);
                }
                else if (curPunc == "." && state.context && state.context.type == "pattern") popContext(state);
                else if (/atom|string|variable/.test(style) && state.context) {
                    if (/[\}\]]/.test(state.context.type))
                        pushContext(state, "pattern", stream.column());
                    else if (state.context.type == "pattern" && !state.context.align) {
                        state.context.align = true;
                        state.context.col = stream.column();
                    }
                }

                return style;
            }
        };
    }
}

CodeMirror.defineMode("span", syntax(false));
CodeMirror.defineMode("span2", syntax(true));

