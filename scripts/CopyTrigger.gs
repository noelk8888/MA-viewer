function onOpen() {
  var ui = SpreadsheetApp.getUi();
  // Creates a new menu named "Highlight" right next to the "Help" menu
  ui.createMenu('Highlight')
    .addItem('Highlight Bill Data (B4:M34)', 'highlightBillData')
    .addToUi();
}

function highlightBillData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Make sure we are on the correct BILL sheet before highlighting
  if (sheet.getSheetId() != '837323267') {
    SpreadsheetApp.getUi().alert("Please switch to the BILL sheet to use this function.");
    return;
  }
  
  // Select the cells so the user can just press Ctrl+C / Cmd+C
  var range = sheet.getRange('B4:M34');
  sheet.setActiveRange(range);
}
