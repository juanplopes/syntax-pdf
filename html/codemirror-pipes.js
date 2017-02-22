/*
 *	derived from mysql mode
 */
var syntax = function (usage, expr) {
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
            ('mon(th)?s?|weeks?'),
            ('bimester'),
            ('trimester'),
            ('quarter'),
            ('semester'),
            ('yrs?|years?'),
            ('items?'),
            ('batch(e?s)?')
        ]);

        var filterKeywords = wordRegexp("", [
            ('TO'),
            ('OR'),
            ('AND'),
            ('NOT')
        ]);

        var keywords = wordRegexp("", [
            ('over'),
            ('as'),
            ('by'),
            ('every'),
            ('at'),
            ('asc'),
            ('desc'),
            ('true'),
            ('false'),
            ('null'),
            ('expand'),
            ('union'),
            ('expiry'),
            ('join|ljoin|rjoin|lrjoin|rljoin'),
            ('on'),
            ('not'),
            ('and'),
            ('or'),
            ('xor'),
            ('atomic'),
            ('assert')
        ]);

        function tokenBase(stream, state) {
            var ch = stream.next();
            curPunc = null;
            state.last_arrow = null;
            if (state.mcall) {
                state.mcall = null;
                if (ch.match(/[_\w\d\.\u00A0-\uFFFF]/)) {
                    stream.eatWhile(/[_\w\d\.\u00A0-\uFFFF]/);
                    return "variable-2";
                }
            }

            if (state.inside_def) {
                if (ch != '>') {
                    stream.eatWhile(/[_\w\d\.\u00A0-\uFFFF]/);
                    if (stream.peek() == '>')
                        return "variable";
                    else
                        return "comment";
                } else {
                    state.inside_def = false;
                    return "comment";
                }
            }

            if (!state.post_filter && (ch == '(' || ch == '[' || ch == '{')) {
                state.filter_paren += 1;
            }
            if (!state.post_filter && (ch == ')' || ch == ']' || ch == '}')) {
                if (state.filter_paren > 0)
                    state.filter_paren -= 1;
                else
                    state.post_filter = true;
            }
            if (ch == "'") {
                state.tokenize = tokenLiteral("'", 'string');
                state.inside_string = true;
                return state.tokenize(stream, state);
            }
            if (ch == "\"" || ch == "}") {
                state.interpolating = false;
                state.tokenize = tokenLiteral("\"", 'string');
                state.inside_string = true;
                return state.tokenize(stream, state);
            }
            if (ch == "{") {
                state.tokenize = tokenLiteral('}', 'variable');
                return state.tokenize(stream, state);
            }
            else if (/[{}\(\),\[\]]/.test(ch)) {
                curPunc = ch;
                return "variable";
            } else if (ch == '\\') {
                state.post_filter = false;
                return "string-2";
            } else if (ch == ';') {
                state.post_filter = false;
                return "keyword";
            } else if (ch == '=' && stream.eat(">") || ch == '\\') {
                if (ch == '=') state.last_arrow = '=>';
                state.post_filter = true;
                return "string-2";
            } else if (ch == '|' && stream.eat(">")) {
                state.last_arrow = '|>';
                return "keyword";
            } else if (ch == ':' || ch == '#' || ch == '$' || ch == '→') {
                if (stream.peek() != ' ' && state.post_filter) {
                    state.mcall = true;
                }
                if (state.post_def-- == 2) {
                    state.post_filter = true;
                }
                return "string-2";
            } else if (ch == '@') {
                var eaten = stream.eat("@");
                if (state.post_filter || eaten) {
                    state.mcall = true;
                }

                return "string-2";
            } else if (usage && ch == '<' && stream.peek().match(/[_\w\d\.\u00A0-\uFFFF]/)) {
                stream.eatWhile(/[_\w\d\.\u00A0-\uFFFF]/);
                state.inside_def = true;
                return "comment";
            } else if (ch == "-") {
                var ch2 = stream.peek();
                if (ch2 == "-") {
                    stream.skipToEnd();
                    return "comment";
                } else {
                    return "keyword";
                }
            } else if (ch.match(/[|&^!+\/%<>=*?~]/)) {
                if (ch == '/' && stream.eat("*")) {
                    state.tokenize = tokenComment;
                    return state.tokenize(stream, state);
                }
                return "keyword";
            } else {
                stream.eatWhile(/[_\w\d\.\u00A0-\uFFFF]/);
                var word = stream.current();
                var last = state.last;
                var number = state.number;

                state.last = word;
                state.number = false;
                if (word == 'def' || word == 'fun') {
                    state.post_filter = false;
                    state.post_def = 2;
                    return "keyword";
                } else if (word == 'assert') {
                    state.post_filter = true;
                    return "keyword";
                } else if ((number || /last|current|every/.test(last)) && ops.test(word)) {
                    return "number";
                } else if (((state.post_filter) ? keywords : filterKeywords).test(word) || last == "over" && /last|current|all|span|while/.test(word)) {
                    return "keyword";
                } else if (/^(at|the)$/.test(last) && /^(the|end)$/.test(word)) {
                    return "keyword";
                } else if (stream.peek() == "(") {
                    return "variable-2";
                } else if (word == "_")
                    return "string-2";
                else {
                    if (!isNaN(word))
                        state.number = true;
                    return "variable";
                }
            }
        }

        function tokenLiteral(quote, rule) {
            return function (stream, state) {
                var escaped = false, ch;
                while ((ch = stream.next()) != null) {
                    if ((ch == quote || /\"|\}/.test(quote) && ch == '$' && stream.eat("{")) && !escaped) {
                        if (ch == '{')
                            state.interpolating = true;
                        state.tokenize = tokenBase;
                        state.inside_string = false;
                        break;
                    }
                    escaped = !escaped && ch == "\\";
                }
                return rule;
            };
        }

        function tokenComment(stream, state) {
            var maybeEnd = false, ch;
            while (ch = stream.next()) {
                if (ch == "/" && maybeEnd) {
                    state.tokenize = tokenBase;
                    break;
                }
                maybeEnd = (ch == "*");
            }
            return "comment";
        }

        function pushContext(state, type, col) {
            state.context = {prev: state.context, indent: state.indent, col: col, type: type};
        }

        function popContext(state) {
            state.indent = state.context.indent;
            state.context = state.context.prev;
        }

        return {
            startState: function (base) {
                return {
                    tokenize: tokenBase,
                    context: null,
                    indent: 0,
                    col: 0,
                    post_filter: expr,
                    filter_paren: 0
                };
            },

            token: function (stream, state) {
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
};

CodeMirror.defineMode("lognit", syntax(false, false));
CodeMirror.defineMode("pipes", syntax(false, false));
CodeMirror.defineMode("pipes2", syntax(true, true));
CodeMirror.defineMode("pipes-expr", syntax(false, true));

