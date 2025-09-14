// /Debugger.gs

/**
 * This function takes a "snapshot" of the entire system's current state
 * and logs it for debugging purposes. It is read-only and does not change any data.
 */
function snapshotSystemState() {
  Logger.log('========== [START] System State Snapshot ==========');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Log sheet data and headers
    const sheetsToLog = [
      SHEETS.CAMPAIGNS,
      SHEETS.QUEUE,
      SHEETS.AUDIENCE,
      SHEETS.TEMPLATES,
      SHEETS.LOGS,
      SHEETS.SENDERS,
      SHEETS.SETTINGS
    ];

    Logger.log('\n--- 1. Sheet Data & Headers ---');
    for (const sheetName of sheetsToLog) {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        Logger.log(`\nSheet "${sheetName}" NOT FOUND.`);
        continue;
      }
      
      const data = sheet.getDataRange().getValues();
      const header = data[0];
      const sampleData = data.slice(1, 101);
      
      Logger.log(`\n=== Sheet: ${sheetName} ===`);
      Logger.log(`Headers: ${JSON.stringify(header)}`);
      Logger.log(`Sample Data (up to 5 rows): ${JSON.stringify(sampleData)}`);
    }

    // 2. Log all current triggers
    Logger.log('\n--- 2. Active Triggers ---');
    const triggers = ScriptApp.getProjectTriggers();
    if (triggers.length === 0) {
      Logger.log('No active triggers found.');
    } else {
      triggers.forEach((trigger, i) => {
        Logger.log(`Trigger #${i + 1}:`);
        Logger.log(`  - Handler Function: ${trigger.getHandlerFunction()}`);
        Logger.log(`  - Type: ${trigger.getEventType()}`);
      });
    }

    // 3. Log script properties
    Logger.log('\n--- 3. Script Properties ---');
    const properties = PropertiesService.getScriptProperties().getProperties();
    if (Object.keys(properties).length === 0) {
        Logger.log('No script properties set.');
    } else {
        Logger.log(JSON.stringify(properties));
    }

    SpreadsheetApp.getUi().alert('System state snapshot has been created in the execution logs. Please copy the logs and share them.');

  } catch (e) {
    Logger.log(`!!-- [ERROR] while taking snapshot: ${e.toString()} --!!`);
    SpreadsheetApp.getUi().alert('An error occurred while creating the snapshot. Please check the logs.');
  }
  
  Logger.log('\n========== [END] System State Snapshot ==========');
}

/**
 * Checks the overall health of the system's configuration.
 * Verifies that all required sheets exist and essential settings are configured.
 * Reports the findings to the user in a UI alert.
 */
function checkSystemHealth() {
  logToDebugSheet('--- System Health Check Started ---');
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let errors = [];
  let warnings = [];
  let successes = 0;

  // 1. Check for all required sheets
  const requiredSheets = Object.values(SHEETS);
  for (const sheetName of requiredSheets) {
    if (ss.getSheetByName(sheetName)) {
      successes++;
    } else {
      errors.push(`Sheet Not Found: The required sheet named "${sheetName}" is missing.`);
    }
  }

  // 2. Check for required settings
  const requiredSettings = ['Slack_Webhook_URL'];
  for (const settingName of requiredSettings) {
    if (getSetting(settingName)) {
      successes++;
    } else {
      errors.push(`Setting Not Found: "${settingName}" is not configured in the '⚙️ Settings' sheet.`);
    }
  }

  // 3. Check for SendGrid API Key
  if (getSendGridApiKey()) {
    successes++;
  } else {
    errors.push("SendGrid API Key is not set. Use the menu 'Piehands CRM > Set SendGrid API Key' to set it.");
  }

  // --- Report Generation ---
  let report = `System Health Check Complete\n\n`;
  if (errors.length > 0) {
    report += `🚨 Found ${errors.length} critical error(s):\n`;
    report += errors.map(e => `- ${e}`).join('\n');
    report += '\n\nThe system will not function correctly until these errors are resolved.';
  } else {
    report += `✅ All ${successes} checks passed successfully! The system appears to be configured correctly.`;
  }
  
  if (warnings.length > 0) {
    report += `\n\n⚠️ Found ${warnings.length} warning(s):\n`;
    report += warnings.map(w => `- ${w}`).join('\n');
  }

  logToDebugSheet(`Health Check Result: ${errors.length} errors, ${warnings.length} warnings.`);
  ui.alert(report);
}
