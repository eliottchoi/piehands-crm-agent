// /Utilities.gs (NEW HELPER FILE)

/**
 * Reads the header row of a sheet and returns an object that maps
 * column names to their 0-based index.
 * e.g., { "Campaign_ID": 0, "Status": 2, ... }
 * @param {Sheet} sheet The Google Sheet object.
 * @return {Object} The column name to index map.
 */
function getHeaderIndexMap(sheet) {
  try { logToDebugSheet(`Generating header map for sheet: "${sheet.getName()}"`); } catch(e){}
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colMap = {};
  headers.forEach((header, i) => {
    if (header) { // Only map non-empty headers
      colMap[header] = i;
    }
  });
  try { logToDebugSheet(`Header map for sheet "${sheet.getName()}": ${JSON.stringify(colMap)}`); } catch(e){}
  return colMap;
}


/**
 * Reads a specific setting value from the Settings sheet.
 * @param {string} settingName The name of the setting to retrieve.
 * @return {string | null} The value of the setting or null if not found.
 */
function getSetting(settingName) {
  try { logToDebugSheet(`Attempting to retrieve setting: "${settingName}"`); } catch(e){}
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = ss.getSheetByName(SHEETS.SETTINGS);
  const settingsData = settingsSheet.getDataRange().getValues();
  
  for (let i = 1; i < settingsData.length; i++) {
    if (settingsData[i][0] === settingName) {
      try { logToDebugSheet(`Found setting "${settingName}" with value: "${settingsData[i][1]}"`); } catch(e){}
      return settingsData[i][1];
    }
  }
  try { logToDebugSheet(`Setting "${settingName}" was NOT found.`); } catch(e){}
  Logger.log(`Setting "${settingName}" not found in Settings sheet.`);
  return null;
}

/**
 * Finds a campaign row by its ID and updates a specific cell in that row.
 * @param {string} campaignId The ID of the campaign to update.
 * @param {string} colName The string header of the column to update.
 * @param {any} value The new value to set in the cell.
 */
function updateCampaignProperty(campaignId, colName, value) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const campaignSheet = ss.getSheetByName(SHEETS.CAMPAIGNS);
    const campaignCols = getHeaderIndexMap(campaignSheet);
    const data = campaignSheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][campaignCols.Campaign_ID]).trim() === String(campaignId).trim()) {
        const colIndex = campaignCols[colName];
        if (colIndex !== undefined) {
          campaignSheet.getRange(i + 1, colIndex + 1).setValue(value);
          logToDebugSheet(`Updated campaign ${campaignId}: Set '${colName}' to '${value}'`);
        } else {
          logToDebugSheet(`ERROR: Column '${colName}' not found in Campaigns sheet.`);
        }
        return;
      }
    }
    logToDebugSheet(`ERROR: Campaign '${campaignId}' not found while trying to update property.`);
  } catch (e) {
    logToDebugSheet(`CRITICAL ERROR in updateCampaignProperty: ${e.toString()}`);
  }
}

/**
 * Calculates the Estimated Time of Arrival (ETA) to complete a campaign.
 * This takes into account the current warmup status and sending speed.
 * @param {number} remainingJobs The number of emails left to send.
 * @return {string} A human-readable ETA string (e.g., "~ 3.5 hours").
 */
function calculateEta(remainingJobs) {
  if (remainingJobs <= 0) {
    return "Completed";
  }

  const BATCH_SPEED_SECONDS = 50 * 1; // 50 jobs * 1 second per job
  const MAX_DAILY_SENDS = MAX_DAILY_SENDS_POST_WARMUP;
  const properties = PropertiesService.getScriptProperties();
  const isWarmupEnabled = properties.getProperty('warmup_enabled') !== 'false';

  let totalSeconds = 0;
  let jobsLeft = remainingJobs;
  let day = 0;

  if (isWarmupEnabled) {
    const warmupStatus = getWarmupStatus(properties);
    let { reputationAgeInDays, dailyLimit } = warmupStatus;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName(SHEETS.LOGS);
    const logs = logSheet.getDataRange().getValues();
    const today = new Date();
    
    let sentToday = 0;
    for (let i = 1; i < logs.length; i++) {
      const logResult = logs[i][4];
      const logTimestamp = new Date(logs[i][0]);
      if (logResult === 'Success' &&
          logTimestamp.getFullYear() === today.getFullYear() &&
          logTimestamp.getMonth() === today.getMonth() &&
          logTimestamp.getDate() === today.getDate()) {
        sentToday++;
      }
    }
    
    let sendsLeftToday = Math.max(0, dailyLimit - sentToday);
    
    while (jobsLeft > 0) {
      if (day === 0) { // Today
        const canSendToday = Math.min(jobsLeft, sendsLeftToday);
        totalSeconds += canSendToday * (BATCH_SPEED_SECONDS / 50);
        jobsLeft -= canSendToday;
      } else { // Future days
        reputationAgeInDays++;
        const futureWarmupStatus = getWarmupStatus(properties, reputationAgeInDays);
        const sendsForThisDay = Math.min(jobsLeft, futureWarmupStatus.dailyLimit);
        totalSeconds += sendsForThisDay * (BATCH_SPEED_SECONDS / 50);
        jobsLeft -= sendsForThisDay;
      }
      if (jobsLeft > 0) {
        totalSeconds += 12 * 60 * 60; // Add ~12 hours for the overnight pause
      }
      day++;
    }
  } else {
    // Simple calculation when warmup is off
    totalSeconds = jobsLeft * (BATCH_SPEED_SECONDS / 50);
  }

  // Convert total seconds to a human-readable format
  if (totalSeconds < 60) {
    return "~ 1 minute";
  }
  const minutes = Math.ceil(totalSeconds / 60);
  if (minutes < 60) {
    return `~ ${minutes} minutes`;
  }
  const hours = (minutes / 60).toFixed(1);
  if (hours < 24) {
    return `~ ${hours} hours`;
  }
  const days = (hours / 24).toFixed(1);
  return `~ ${days} days`;
}


/**
 * Logs a message to the '🐞 Debug' sheet for persistent, detailed debugging.
 * Creates the sheet if it doesn't exist.
 * This function is designed to fail silently if spreadsheet access is unavailable.
 * @param {string} message The debug message to log.
 */
function logToDebugSheet(message) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return; // Can't log if there's no active spreadsheet
    let debugSheet = ss.getSheetByName('🐞 Debug');
    if (!debugSheet) {
      debugSheet = ss.insertSheet('🐞 Debug', 0);
      // More structured header
      debugSheet.appendRow(['Timestamp', 'Function Context', 'Details']); 
    }
    
    // Attempt to get the name of the function that called this logger
    let functionName = 'Unknown';
    try {
      functionName = (new Error()).stack.split('\n')[1].match(/at\s+([^\s]+)/)[1];
    } catch(e) { /* ignore */ }

    debugSheet.appendRow([new Date(), functionName, message]);
  } catch (e) {
    // Fails silently to not interrupt the main script execution.
    Logger.log(`[CRITICAL] Failed to write to debug sheet: ${e.toString()}`);
  }
}
