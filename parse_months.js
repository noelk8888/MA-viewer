const fs = require('fs');
const lines = fs.readFileSync('temp_summary.csv', 'utf-8').split('\n');

let lastMonth = null;
let startRow = -1;

for (let i = 0; i < lines.length; i++) {
  const cols = lines[i].split(',');
  if (cols.length > 2) {
    const colC = cols[2].replace(/"/g, '').trim();
    if (['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].includes(colC)) {
      console.log(`${colC} is at row ${i + 1}`);
    }
  }
}
