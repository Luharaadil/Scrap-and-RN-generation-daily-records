/**
 * Combined Production & Scrap Management Script
 * Features: Image Upload to Drive, Summary Sync, User Management, scrap requirements / reasons settings, and CRUD operations.
 */

const SPREADSHEET_ID = '1GHwq2tHt0ZDwuGHfTZSov6b2JgfURUKt7c8WLZWPGKs';
const SUMMARY_SHEET_NAME = 'ProductionSummary';
const SCRAP_SHEET_NAME = 'ScrapDetails';
const SETTINGS_SHEET_NAME = 'Settings';
const USERS_SHEET_NAME = 'Users';

let cachedTimeZone = '';

function getSheetTimeZone() {
  if (!cachedTimeZone) {
    cachedTimeZone = SpreadsheetApp.openById(SPREADSHEET_ID).getSpreadsheetTimeZone();
  }
  return cachedTimeZone;
}

// 1. INITIAL SETUP
function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  if (!ss.getSheetByName(SUMMARY_SHEET_NAME)) {
    ss.insertSheet(SUMMARY_SHEET_NAME).appendRow(['Date', 'Shift', 'Timestamp', 'BIC Usage', 'BIC Scrap', 'PLY Usage', 'PLY Scrap', 'Rubber Usage', 'Rubber Scrap', 'RN Scrap', 'Chafer Usage', 'Chafer Scrap', 'Extrusion Rubber Usage', 'Mixing Rubber Usage']);
  }
  
  let scrapSheet = ss.getSheetByName(SCRAP_SHEET_NAME);
  if (!scrapSheet) {
    ss.insertSheet(SCRAP_SHEET_NAME).appendRow(['Date', 'Material', 'Weight', 'Reason', 'ImageURL', 'Shift', 'Section', 'MaterialName', 'Timestamp', 'Reason for Scrap', 'Machine No', 'Operator Id', 'User']);
  } else {
    const headers = scrapSheet.getRange(1, 1, 1, scrapSheet.getLastColumn()).getValues()[0];
    if (headers.indexOf('User') === -1) {
      scrapSheet.getRange(1, 13).setValue('User');
    }
  }

  if (!ss.getSheetByName(SETTINGS_SHEET_NAME)) {
    ss.insertSheet(SETTINGS_SHEET_NAME).appendRow(['Key', 'Value']);
  }
  if (!ss.getSheetByName(USERS_SHEET_NAME)) {
    ss.insertSheet(USERS_SHEET_NAME).appendRow(['ID', 'Password', 'Role']);
  }
}

function formatDateString(dateValue) {
  if (dateValue instanceof Date) return Utilities.formatDate(dateValue, getSheetTimeZone(), 'yyyy-MM-dd');
  let str = String(dateValue).trim();
  if (str.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const parts = str.split('/');
    return parts[2] + '-' + parts[1] + '-' + parts[0];
  }
  return str;
}

// 2. GET REQUESTS
function doGet(e) {
  setupSheets();
  const action = e.parameter.action;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  if (action === 'getUsers') {
    const sheet = ss.getSheetByName(USERS_SHEET_NAME);
    const uData = sheet.getDataRange().getValues();
    const users = uData.slice(1).map(row => ({ id: String(row[0]), password: String(row[1]), role: String(row[2] || 'User') }));
    return createJsonResponse({ users: users });
  }

  if (action === 'getTargets') {
    const summarySheet = ss.getSheetByName(SUMMARY_SHEET_NAME);
    const lastRow = summarySheet.getLastRow();
    let targets = [];
    let configs = [];
    if (lastRow >= 2) {
      const targetData = summarySheet.getRange("Z2:AB" + lastRow).getValues();
      targets = targetData.map(row => ({ category: row[0], period: row[1], value: row[2] })).filter(t => t.category);
      const configData = summarySheet.getRange("AC2:AD" + lastRow).getValues();
      configs = configData.map(row => ({ id: String(row[0] || '').trim(), password: String(row[1] || '').trim() })).filter(c => c.id && c.password);
    }
    return createJsonResponse({targets: targets, configs: configs});
  }

  if (action === 'getData' || action === 'getRangeData') {
    const startDate = e.parameter.date || e.parameter.startDate;
    const endDate = e.parameter.endDate || startDate;
    const summaryData = ss.getSheetByName(SUMMARY_SHEET_NAME).getDataRange().getValues();
    const scrapData = ss.getSheetByName(SCRAP_SHEET_NAME).getDataRange().getValues();
    
    const summaries = summaryData.slice(1).filter(row => {
      const d = formatDateString(row[0]);
      return d >= startDate && d <= endDate;
    }).map(row => ({
      date: formatDateString(row[0]), shift: row[1], timestamp: row[2], bicUsage: row[3], bicScrap: row[4], 
      plyUsage: row[5], plyScrap: row[6], rubberUsage: row[7], rubberScrap: row[8], rnScrap: row[9], 
      chaferUsage: row[10], chaferScrap: row[11], extrusionRubberUsage: row[12], mixingRubberUsage: row[13] || row[7]
    }));

    const scraps = scrapData.slice(1).filter(row => {
      const d = formatDateString(row[0]);
      return d >= startDate && d <= endDate;
    }).map(row => ({
      date: formatDateString(row[0]), material: row[1], weight: row[2], reason: row[3], imageUrl: row[4], 
      shift: row[5], section: row[6], materialName: row[7], timestamp: row[8], mainReason: row[9], 
      machineNo: row[10], operatorId: row[11], user: row[12]
    }));

    return createJsonResponse({ summaries, scraps });
  }
  
  if (action === 'getCustomRanges') {
    const settingsSheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
    let ranges = null;
    if (settingsSheet) {
      const data = settingsSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === 'customMonthRanges') {
          try { ranges = JSON.parse(data[i][1]); } catch (e) {}
          break;
        }
      }
    }
    return createJsonResponse({ ranges: ranges });
  }

  // --- NEW GET SCRAP SETTINGS ACTION ---
  if (action === 'getScrapSettings') {
    const settingsSheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
    let scrapPicRequirements = null;
    let materialReasons = null;
    if (settingsSheet) {
      const data = settingsSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === 'scrapPicRequirements') {
          try { scrapPicRequirements = JSON.parse(data[i][1]); } catch (err) {}
        } else if (data[i][0] === 'materialReasons') {
          try { materialReasons = JSON.parse(data[i][1]); } catch (err) {}
        }
      }
    }
    return createJsonResponse({ 
      scrapPicRequirements: scrapPicRequirements, 
      materialReasons: materialReasons 
    });
  }

  return createJsonResponse({error: 'Invalid action'});
}

// 3. POST REQUESTS
function doPost(e) {
  setupSheets();
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    switch(action) {
      case 'saveUser': return saveUser(data);
      case 'saveSummary': return saveSummary(data);
      case 'saveScrap': return saveScrap(data);
      case 'deleteScrap': return deleteScrap(data); 
      case 'updateScrapFull': return updateScrapFull(data);
      case 'updateScrapReason': return updateScrapReason(data);
      case 'saveTargets': return saveTargets(data.targets);
      case 'saveCustomRanges': return saveCustomRanges(data.ranges);
      case 'getInventory': return getInventory();
      case 'saveInventory': return saveInventory(data.records);
      case 'saveScrapSettings': return saveScrapSettings(data); // --- NEW CASE ---
      default: return createJsonResponse({error: 'Unknown action: ' + action});
    }
  } catch (error) {
    return createJsonResponse({error: error.toString()});
  }
}

// 4. OPTIONS (CORS Support)
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// --- HELPER FUNCTIONS ---

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function saveUser(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  ss.getSheetByName(USERS_SHEET_NAME).appendRow([data.userId, data.password, data.role || 'User']);
  return createJsonResponse({ success: true });
}

function saveSummary(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SUMMARY_SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  let rowIndex = -1;

  for (let i = 1; i < values.length; i++) {
    if (formatDateString(values[i][0]) === data.date && String(values[i][1]) === String(data.shift)) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex > -1) {
    sheet.getRange(rowIndex, 3).setValue(data.timestamp || new Date().toISOString());
    
    // Updates only the fields passed from the frontend, preserving data from other sections
    if (data.bicUsage !== undefined) sheet.getRange(rowIndex, 4).setValue(data.bicUsage);
    if (data.plyUsage !== undefined) sheet.getRange(rowIndex, 6).setValue(data.plyUsage);
    if (data.rubberUsage !== undefined) sheet.getRange(rowIndex, 8).setValue(data.rubberUsage);
    if (data.chaferUsage !== undefined) sheet.getRange(rowIndex, 11).setValue(data.chaferUsage);
    if (data.extrusionRubberUsage !== undefined) sheet.getRange(rowIndex, 13).setValue(data.extrusionRubberUsage);
    if (data.mixingRubberUsage !== undefined) sheet.getRange(rowIndex, 14).setValue(data.mixingRubberUsage);
  } else {
    // If it's a completely new row entry, insert defaults seamlessly
    sheet.appendRow([
      "'" + data.date, 
      data.shift, 
      data.timestamp || new Date().toISOString(), 
      data.bicUsage || 0, 
      0, // BIC Scrap
      data.plyUsage || 0, 
      0, // PLY Scrap
      data.rubberUsage || 0, 
      0, // Rubber Scrap
      0, // RN Scrap
      data.chaferUsage || 0, 
      0, // Chafer Scrap
      data.extrusionRubberUsage || 0, 
      data.mixingRubberUsage || 0
    ]);
  }
  return createJsonResponse({ success: true });
}

function saveScrap(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const scrapSheet = ss.getSheetByName(SCRAP_SHEET_NAME);
  let imageUrl = '';
  
  if (data.imageBase64) {
    const folderIterator = DriveApp.getFoldersByName('ScrapImages');
    let folder = folderIterator.hasNext() ? folderIterator.next() : DriveApp.createFolder('ScrapImages');
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const blob = Utilities.newBlob(Utilities.base64Decode(data.imageBase64.split(',')[1]), data.imageMimeType, 'scrap_' + new Date().getTime());
    imageUrl = folder.createFile(blob).getUrl();
  }

  const userIdentifier = data.userId || data.addedBy || 'Unknown';

  scrapSheet.appendRow([
    "'" + data.date, 
    data.material, 
    data.weight, 
    data.reason, 
    imageUrl, 
    data.shift || '', 
    data.section || '', 
    data.materialName || '', 
    data.timestamp || '', 
    data.mainReason || data.scrapReason || '', 
    data.machineNo || '', 
    data.operatorId || '', 
    userIdentifier
  ]);
  
  updateSummaryScrapWeight(ss, data.date, data.shift, data.material, data.weight);
  
  return createJsonResponse({success: true, imageUrl: imageUrl});
}

function updateScrapFull(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SCRAP_SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][8] == data.timestamp) { 
      if (data.weight !== undefined) sheet.getRange(i + 1, 3).setValue(data.weight);
      if (data.mainReason !== undefined) sheet.getRange(i + 1, 10).setValue(data.mainReason);
      if (data.reason !== undefined) sheet.getRange(i + 1, 4).setValue(data.reason);
      if (data.machineNo !== undefined) sheet.getRange(i + 1, 11).setValue(data.machineNo);
      if (data.operatorId !== undefined) sheet.getRange(i + 1, 12).setValue(data.operatorId);
      if (data.userId || data.addedBy) sheet.getRange(i + 1, 13).setValue(data.userId || data.addedBy);
      break;
    }
  }
  return createJsonResponse({success: true});
}

function deleteScrap(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SCRAP_SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][8] == data.timestamp) {
      const weightToDelete = values[i][2];
      const material = values[i][1];
      const date = formatDateString(values[i][0]);
      const shift = values[i][5];
      
      updateSummaryScrapWeight(ss, date, shift, material, -weightToDelete);
      
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return createJsonResponse({success: true});
}

function updateScrapReason(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SCRAP_SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][8] == data.timestamp) {
      sheet.getRange(i + 1, 4).setValue(data.reason);
      break;
    }
  }
  return createJsonResponse({success: true});
}

function updateSummaryScrapWeight(ss, date, shift, material, weight) {
  const summarySheet = ss.getSheetByName(SUMMARY_SHEET_NAME);
  const summaryData = summarySheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < summaryData.length; i++) {
    if (formatDateString(summaryData[i][0]) === date && String(summaryData[i][1]) === String(shift)) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex > -1) {
    let colIndex = -1; 
    if (material === 'BIC') colIndex = 5;
    else if (material === 'PLY') colIndex = 7;
    else if (material === 'Rubber') colIndex = 9;
    else if (material === 'RN') colIndex = 10;
    else if (material === 'Chafer') colIndex = 12;
    
    if (colIndex > -1) {
      const currentVal = summarySheet.getRange(rowIndex, colIndex).getValue() || 0;
      summarySheet.getRange(rowIndex, colIndex).setValue(Number(currentVal) + Number(weight));
    }
  }
}

function saveTargets(targets) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SUMMARY_SHEET_NAME);
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) sheet.getRange("Z2:AB" + lastRow).clear();
  
  const rows = targets.map(t => [t.category, t.period, t.value]);
  if (rows.length > 0) {
    sheet.getRange(2, 26, rows.length, 3).setValues(rows);
  }
  return createJsonResponse({success: true});
}

function saveCustomRanges(ranges) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'customMonthRanges') {
      rowIndex = i + 1;
      break;
    }
  }
  const rangesStr = JSON.stringify(ranges);
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 2).setValue(rangesStr);
  } else {
    sheet.appendRow(['customMonthRanges', rangesStr]);
  }
  return createJsonResponse({ status: 'success' });
}

// --- NEW SCRAP SETTINGS PERSISTENCE HANDLER ---
function saveScrapSettings(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  if (!sheet) {
    ss.insertSheet(SETTINGS_SHEET_NAME).appendRow(['Key', 'Value']);
  }
  const values = sheet.getDataRange().getValues();
  
  const settings = data.settings || {};
  for (const key of Object.keys(settings)) {
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === key) {
        rowIndex = i + 1;
        break;
      }
    }
    const valStr = JSON.stringify(settings[key]);
    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 2).setValue(valStr);
    } else {
      sheet.appendRow([key, valStr]);
    }
  }
  return createJsonResponse({ success: true });
}

// --- NEW INVENTORY FUNCTIONS ---
function getInventory() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Inventory');
  if (!sheet) return createJsonResponse({ records: [] });
  
  const data = sheet.getDataRange().getValues();
  const records = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0] || row[1]) {
      records.push({
        section: String(row[0] || ''),
        materialName: String(row[1] || ''),
        batchesOrRolls: Number(row[2] || 0),
        lastUpdated: String(row[3] || '')
      });
    }
  }
  return createJsonResponse({ records: records });
}

function saveInventory(records) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Inventory');
  
  // Create sheet and append headers if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet('Inventory');
    sheet.appendRow(['Section', 'Material Name', 'Batches/Rolls', 'Last Updated']);
  } else if (sheet.getLastRow() === 0) {
    // If sheet exists but is completely empty, add headers
    sheet.appendRow(['Section', 'Material Name', 'Batches/Rolls', 'Last Updated']);
  }
  
  // Append new records to the bottom (downside) of existing data
  if (records && records.length > 0) {
    const rows = records.map(r => [
      r.section || '',
      r.materialName || '',
      r.batchesOrRolls || 0,
      r.lastUpdated || new Date().toISOString()
    ]);
    const nextRow = sheet.getLastRow() + 1;
    sheet.getRange(nextRow, 1, rows.length, 4).setValues(rows);
  }
  return createJsonResponse({ success: true });
}
