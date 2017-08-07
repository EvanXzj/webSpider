const Excel = require('exceljs');
const source = require('./departments/departments.json');

var workbook = new Excel.Workbook();
var worksheet = workbook.addWorksheet('sheet', {
  pageSetup: {paperSize: 9, orientation: 'landscape'}
});
var rows = [
  ['科室', '病症名称'], // row by array
];

let noSonExec = (sourceNoSon, rows) => {

  sourceNoSon.forEach(item => {
    let deparment = item.title;
    item.diseases.forEach(s => {
      rows.push([deparment, s])
    })
  })
};

async function run() {

  noSonExec(source[0], rows);

  source[1].forEach(item => {
    noSonExec(item.subDepart, rows);
  })

  worksheet.addRows(rows);
  workbook.xlsx.writeFile('./excel/symptom.xlsx')
    .then(function () {
      // use workbook
    });
}

run()

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at:', p, 'reason:', reason)
  process.exit(0)
})


