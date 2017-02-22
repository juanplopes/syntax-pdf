#!/bin/bash

tmpfile=$(mktemp /tmp/syntax-pdf.XXXXXX).pdf

generate() {
    DATA=`echo "$3" | tr '\n' "\\n"`
    echo ${DATA//\//\\/}
    sed "s/\\\$\\\$TEXT\\\$\\\$/${DATA//\//\\/}/" html/index.html | sed "s/\\\$\\\$MODE\\\$\\\$/$2/" > html/temp.html

    html-pdf html/temp.html $tmpfile
    mkdir -p output
    pdfcrop $tmpfile output/$1.pdf
    rm html/temp.html
}

cd "$(dirname "$0")"
rm -rf output   
generate 'first_example' 'pipes' 'StockTick symbol:GOOG\n=> avg(price#) over last day every minute\n=> @filter _ > 813.50'
generate 'expr_example_1' 'pipes-expr' "split('a,b,c', ',')\n'a,b,c':split(',')"
generate 'seq_example_1' 'pipes-expr' "products |> price# * quantity#"
generate 'seq_example_2' 'pipes-expr' "products |> sum(price# * quantity#)"

generate 'types_number' 'pipes-expr' '42, 42.0, 1e42'
generate 'types_string' 'pipes-expr' "'42', \"42\""
generate 'types_boolean' 'pipes-expr' "true, false"
generate 'types_period' 'pipes-expr' "1 day, 42 minutes"
generate 'types_seq' 'pipes-expr' "(1, 2, 3, 4), range(10)"
generate 'types_row' 'pipes-expr' "(123 as abc, 456 as def)"

