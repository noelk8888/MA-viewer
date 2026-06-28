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

for (let i = 0; i < 110; i++) {
  const cols = parseCsvLine(lines[i]);
  if (cols[12] && cols[12].trim() !== '' || cols[13] && cols[13].trim() !== '' || cols[14] && cols[14].trim() !== '') {
    console.log(`Row ${i+1}: Col M=${cols[12]}, Col N=${cols[13]}, Col O=${cols[14]}`);
  }
}
