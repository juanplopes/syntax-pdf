function ready(fn) {
    if (document.addEventListener) {
        document.addEventListener('DOMContentLoaded', fn);
    } else {
        document.attachEvent('onreadystatechange', function() {
            if (document.readyState === 'interactive')
                fn();
        });
    }
}

function forEach(array, fn) {
    for (i = 0; i < array.length; i++)
        fn(array[i], i);
}

function addClass(el, className) {
    if (el.classList)
        el.classList.add(className);
    else
        el.className += ' ' + className;
}

function configureSyntax(className, mode) {
    forEach(document.querySelectorAll('.' + className), function(el) {
        var code = el.textContent || el.innerText;
        while(el.firstChild)
            el.removeChild(el.firstChild);

        CodeMirror.runMode(code.trim(), mode, el);
        addClass(el, 'cm-s-default');
    });

}

ready(function() {
    configureSyntax('pipes', 'pipes')
    configureSyntax('pipes2', 'pipes2')
    configureSyntax('expr', 'pipes-expr')
    configureSyntax('span', 'span')
    configureSyntax('span2', 'span2')
    configureSyntax('json', 'javascript')
});
