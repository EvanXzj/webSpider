
var fs =require('fs')
var json2xls = require('json2xls');
var json = {
    foo: 'bar',
    qux: 'moo',
    poo: 123,
    stux: new Date()
}

//export only the field 'poo'
var xls = json2xls(json,{
    fields: ['poo']
});

//export only the field 'poo' as string
var xls = json2xls(json,{
    fields: {poo:'string'}
});

fs.writeFileSync('data.xlsx', xls, 'binary');