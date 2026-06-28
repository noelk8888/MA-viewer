const fs = require('fs');
const lines = fs.readFileSync('temp_summary.csv', 'utf-8').split('\n');
for (let i = 5; i < 25; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
