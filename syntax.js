var pdf = require('phantom-html2pdf');
 
pdf.convert({html: './hello.html'}, function(err, result) {
    /* Using the file writer and callback */
    result.toFile("hello.pdf", function() {});
});
