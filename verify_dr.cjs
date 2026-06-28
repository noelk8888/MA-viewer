const fs = require('fs');
const lines = fs.readFileSync('temp_summary.csv', 'utf-8').split('\n');
const parseCsvLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += line[i];
    }
  }
  result.push(current);
  return result;
};

const drRow = parseCsvLine(lines[105]); // Row 106
console.log(`Row 106: Col S=${drRow[18]}, Col T=${drRow[19]}, Col U=${drRow[20]}`);

const chinaRow = parseCsvLine(lines[153]); // Row 154
console.log(`Row 154: Col S=${chinaRow[18]}, Col T=${chinaRow[19]}, Col U=${chinaRow[20]}`);
