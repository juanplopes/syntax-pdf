#!/bin/bash

tmpfile=$(mktemp /tmp/syntax-pdf.XXXXXX).pdf

generate() {
    DATA=`echo "$3" | tr '\n' "\\n"` 
    DATA=${DATA///\//\\/}
    DATA=${DATA//\&/\\\&}
    DATA=${DATA//\</\\\&lt\;}
    DATA=${DATA//\>/\\\&gt\;}
    echo $DATA
    sed "s/\\\$\\\$TEXT\\\$\\\$/${DATA}/" html/index.html | sed "s/\\\$\\\$MODE\\\$\\\$/$2/" > html/temp.html

    html-pdf html/temp.html $tmpfile
    mkdir -p output
    pdfcrop $tmpfile output/$1.pdf
#    rm html/temp.html
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

generate 'row_literal_1' 'pipes-expr' "(1, 2, 3)"
generate 'row_literal_2' 'pipes-expr' "(1 as a, 2 as b, 3 as c)"
generate 'row_literal_3' 'pipes-expr' "(42 as answer,)"

generate 'default_pipe_example_1' 'pipes-expr' "avg(value#), count() over last minute every 10 seconds"
generate 'default_pipe_example_2' 'pipes2' "<aggregations> over <window> every <output>"

generate 'by_example_1' 'pipes' "StockTick => avg(price#) by symbol every minute"
generate 'by_example_2' 'pipes' "StockTick => @onchange price# by symbol"
generate 'by_example_3' 'pipes' "StockTick => @onchange price# by symbol expiry 1 hour"

generate 'union_example' 'pipes' "StockTick symbol:GOOG\n=> [\n    avg(price#) over last day every minute\n    union\n    stdev(price#) over last hour every minute\n]"
generate 'join_example_1' 'pipes' "StockTick symbol:GOOG\n=> [\n    avg(price#) over last day every minute\n    join\n    stdev(price#) over last hour every minute\n]"
generate 'join_example_2' 'pipes' "StockTick\n=> [\n    avg(price#) by symbol over last day every minute\n    join on symbol\n    stdev(price#) by symbol over last hour every minute\n]"

generate 'macro_example_1' 'pipes' "def hello(name):\n    \"Hello \${name}!\"\;\nLoginSucessful => hello(displayName) as text"
generate 'macro_example_2' 'pipes' "def total(list, &prop1, &prop2):\n    list:seq |> sum(prop1#*prop2#);\nOrder => products:total(price, quantity)"
generate 'macro_example_3' 'pipes' "def @totalpipe(list, &prop1, &prop2):\n    @filter list != null => list:seq |> sum(prop1*prop2);\nOrder => @totalpipe products, price#, quantity#"



