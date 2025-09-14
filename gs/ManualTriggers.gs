// /ManualTriggers.gs (FINAL AND CORRECTED VERSION)

const MAX_DAILY_SENDS_POST_WARMUP = 20000; // Safe default after warmup

function manuallyApproveAndStartSending(campaignId, user) {
  logToDebugSheet(`--- Function Start --- Campaign '${campaignId}', User: '${user}'.`);

  // --- ADVANCED DEBUGGING ---
  const ssForDebug = SpreadsheetApp.getActiveSpreadsheet();
  const debugSheet = ssForDebug.getSheetByName('🐞 Debug');
  if (debugSheet) {
    debugSheet.appendRow([new Date(), `[DEBUG] manuallyApproveAndStartSending started for campaign '${campaignId}' by user '${user}'.`]);
  }
  // --- END ADVANCED DEBUGGING ---

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const campaignSheet = ss.getSheetByName(SHEETS.CAMPAIGNS);
  const campaignCols = getHeaderIndexMap(campaignSheet);
  const campaigns = campaignSheet.getDataRange().getValues();
  
  let campaignFound = false; // Flag to check if we found the campaign at all

  for (let i = 1; i < campaigns.length; i++) {
    // ROBUSTNESS FIX: Convert to string and trim whitespace from both the sheet value and the incoming value to prevent mismatches.
    const currentCampaignId = String(campaigns[i][campaignCols.Campaign_ID]).trim();
    const campaignIdToFind = String(campaignId).trim();
    
    if (currentCampaignId === campaignIdToFind) {
      campaignFound = true;
      const status = campaigns[i][campaignCols.Status];

      // --- ADVANCED DEBUGGING ---
      if (debugSheet) {
        debugSheet.appendRow([new Date(), `[DEBUG] Campaign '${campaignId}' found. Current status is '${status}'.`]);
      }
      // --- END ADVANCED DEBUGGING ---

      if (status === 'Pending_Approval') {
        Logger.log(`Found campaign to approve: ${campaignId}. Changing status to 'Running'.`);
        updateCampaignProperty(campaignId, 'Status', 'Running'); // CRITICAL FIX: Update the actual status
        updateCampaignProperty(campaignId, 'Notes', `Approved by ${user} on Slack. Starting email dispatch.`);
        logToDebugSheet(`Set campaign '${campaignId}' status to 'Running'.`);
        createNextBatchTrigger(campaignId);
        return; // Success, exit function.
      } else {
        // LOGGING ENHANCEMENT: Found the campaign, but status is wrong.
        logToDebugSheet(`Campaign '${campaignId}' status is '${status}', not 'Pending_Approval'. Approval ignored.`);
        Logger.log(`Campaign ${campaignId} was found, but its status is '${status}', not 'Pending_Approval'. Approval ignored.`);
        return; // Found the campaign, but can't act. No need to loop further.
      }
    }
  }

  if (!campaignFound) {
    // --- ADVANCED DEBUGGING ---
    if (debugSheet) {
      debugSheet.appendRow([new Date(), `[DEBUG] Campaign '${campaignId}' was NOT found in the sheet.`]);
    }
    // --- END ADVANCED DEBUGGING ---
    logToDebugSheet(`Campaign '${campaignId}' was NOT found in the sheet.`);
    Logger.log(`Could not find a campaign with ID ${campaignId}. Approval ignored.`);
  }
}

function processBatch() {
  logToDebugSheet(`--- Function Start ---`);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(SHEETS.LOGS); // Get log sheet early for error logging

  try {
  const properties = PropertiesService.getScriptProperties();
  const campaignId = properties.getProperty('activeCampaignId');
    logToDebugSheet(`Retrieved 'activeCampaignId' from Properties: "${campaignId}"`);

    if (!campaignId) {
      logToDebugSheet("CRITICAL: No active campaign ID found in properties. Process cannot run.");
      return;
    }
    
    // Update timestamp at the start of the process
    updateCampaignProperty(campaignId, 'Last_Processed_At', new Date());

    // --- AUTOMATIC WARMUP & DAILY LIMIT LOGIC ---
    const isWarmupEnabled = properties.getProperty('warmup_enabled') !== 'false'; // Enabled by default
    let dailyLimit;

    if (isWarmupEnabled) {
      const warmupStatus = getWarmupStatus(properties); // Pass properties object
      dailyLimit = warmupStatus.dailyLimit;
      logToDebugSheet(`Warmup is enabled. Day ${warmupStatus.reputationAgeInDays}, Daily Limit: ${dailyLimit}`);
    } else {
      dailyLimit = MAX_DAILY_SENDS_POST_WARMUP;
      logToDebugSheet(`Warmup is disabled. Using max daily limit of ${dailyLimit}`);
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName(SHEETS.LOGS);
    const logs = logSheet.getDataRange().getValues();
    const today = new Date();
    let sentToday = 0;

    // Calculate total sent for ALL campaigns today
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

    if (sentToday >= dailyLimit) {
      const resumeTime = new Date(today.getTime() + (24 * 60 * 60 * 1000));
      resumeTime.setHours(9, 0, 0, 0); // Schedule for 9 AM tomorrow
      
      deleteCampaignTrigger(campaignId); // Delete old trigger
      const trigger = ScriptApp.newTrigger('processBatch').timeBased().at(resumeTime).create();
      PropertiesService.getScriptProperties().setProperty(`campaign_trigger_${campaignId}`, trigger.getUniqueId());

      const note = `Paused. Daily limit of ${dailyLimit} reached. Sent ${sentToday} today. Resuming around ${resumeTime.toLocaleString()}.`;
      updateCampaignProperty(campaignId, 'Notes', note);
      logToDebugSheet(note);
      return; // Stop processing for today
    }
    // --- END DAILY LIMIT LOGIC ---


  const queueSheet = ss.getSheetByName(SHEETS.QUEUE);
  const fullQueueData = queueSheet.getDataRange().getValues();
  Logger.log(`--- [START] processBatch ---`);
  Logger.log(`Retrieved 'activeCampaignId' from Properties: "${campaignId}"`);
  Logger.log(`Full data from Queue Sheet at start of execution: ${JSON.stringify(fullQueueData)}`);

  if (!campaignId) {
      logToDebugSheet("CRITICAL: No active campaign ID found. Stopping process.");
    Logger.log("CRITICAL: No active campaign ID found. Stopping process and deleting triggers.");
      deleteCampaignTrigger(campaignId); // Use safe delete
    return;
  }
  
  const queueCols = getHeaderIndexMap(queueSheet);
    const BATCH_SIZE = 50; // Increased from 20 for faster processing

  const pendingJobs = [];
  for (let i = 1; i < fullQueueData.length; i++) { 
      // ROBUSTNESS FIX: Use trimmed string comparison
      const currentCampaignId = String(fullQueueData[i][queueCols.Campaign_ID]).trim();
      if (currentCampaignId === campaignId.trim() && fullQueueData[i][queueCols.Status] === 'Pending') {
      pendingJobs.push({ rowIndex: i + 1, data: fullQueueData[i] });
    }
  }

  Logger.log(`Searching for 'Pending' jobs for Campaign ID "${campaignId}". Found ${pendingJobs.length} jobs.`);
    logToDebugSheet(`Found ${pendingJobs.length} 'Pending' jobs for Campaign ID "${campaignId}".`);

  if (pendingJobs.length === 0) {
    Logger.log('No more pending jobs found for this campaign. Proceeding to complete campaign.');
      logToDebugSheet('No more pending jobs found. Completing campaign.');
    completeCampaign(campaignId);
    return;
  }

  const jobsToProcess = pendingJobs.slice(0, BATCH_SIZE);

    // --- CORRECTED PROGRESS LOGIC ---
    // Calculate the total number of jobs for this campaign from the Queue sheet.
    let totalInQueueForCampaign = 0;
    for (let i = 1; i < fullQueueData.length; i++) {
        if (String(fullQueueData[i][queueCols.Campaign_ID]).trim() === campaignId.trim()) {
            totalInQueueForCampaign++;
        }
    }

    // Calculate how many have already been processed (sent or failed) for this campaign from the Log sheet.
    let processedForCampaign = 0;
    for (let i = 1; i < logs.length; i++) {
        if (String(logs[i][1]).trim() === campaignId.trim()) {
            processedForCampaign++;
        }
    }
    const sentCountForCampaign = processedForCampaign; // for clarity in the log message

    const progressText = `${sentCountForCampaign} / ${totalInQueueForCampaign}`;
    updateCampaignProperty(campaignId, 'Progress', progressText);

    // --- REAL-TIME ETA CALCULATION ---
    const remainingJobs = totalInQueueForCampaign - sentCountForCampaign;
    const eta = calculateEta(remainingJobs);
    updateCampaignProperty(campaignId, 'Notes', `Processing ${sentCountForCampaign + 1} - ${sentCountForCampaign + jobsToProcess.length} of ${totalInQueueForCampaign} emails. (ETA: ${eta})`);
    // --- END REAL-TIME ETA CALCULATION ---

    logToDebugSheet(`Processing a batch of ${jobsToProcess.length} jobs.`);
  Logger.log(`Found ${pendingJobs.length} pending jobs. Processing a batch of ${jobsToProcess.length}.`);

  for (const job of jobsToProcess) {
    const queueRow = job.rowIndex;
    const jobData = job.data;
    const creatorId = jobData[queueCols.Creator_ID];
    const recipientEmail = jobData[queueCols.Recipient_Email];
    const senderEmail = jobData[queueCols.Sender_Email];
    const subject = jobData[queueCols.Final_Subject];
    const body = jobData[queueCols.Final_Body];

    queueSheet.getRange(queueRow, queueCols.Status + 1).setValue('Processing');
      logToDebugSheet(`Processing job for ${recipientEmail}.`);
      const result = sendEmail(senderEmail, recipientEmail, subject, body, campaignId); // Pass campaignId
    
    const timestamp = new Date();
    let logResult = '';
    let logDetails = '';

    if (result.success) {
      queueSheet.getRange(queueRow, queueCols.Status + 1).setValue('Sent');
      logResult = 'Success';
      logDetails = `Message ID: ${result.messageId}`;
    } else {
      queueSheet.getRange(queueRow, queueCols.Status + 1).setValue('Failed');
      logResult = 'Failed';
      logDetails = result.error;
    }
    logSheet.appendRow([timestamp, campaignId, creatorId, 'Send Email', logResult, logDetails]);
      logToDebugSheet(`Job for ${recipientEmail} completed with status: ${logResult}.`);
    
      Utilities.sleep(1000); // Reduced from 5000 for faster processing
  }

  if (pendingJobs.length > BATCH_SIZE) {
    createNextBatchTrigger(campaignId);
  } else {
    completeCampaign(campaignId);
  }
  
  Logger.log(`--- [END] processBatch ---`);
  } catch (e) {
    // ERROR HANDLING: Log any critical failure during the batch process
    const campaignIdForError = PropertiesService.getScriptProperties().getProperty('activeCampaignId') || 'UNKNOWN';
    Logger.log(`!!-- CRITICAL ERROR in processBatch for campaign ${campaignIdForError}: ${e.toString()} --!! Stack: ${e.stack}`);
    logToDebugSheet(`CRITICAL ERROR for campaign ${campaignIdForError}: ${e.toString()}`);
    updateCampaignProperty(campaignIdForError, 'Notes', `CRITICAL ERROR: ${e.toString()}. Campaign halted.`);
    if (logSheet) {
      logSheet.appendRow([new Date(), campaignIdForError, 'System', 'processBatch', 'Critical Failure', `Error: ${e.toString()}`]);
    }
    // Clean up to prevent broken state
    deleteCampaignTrigger(campaignIdForError);
  }
}

function createNextBatchTrigger(campaignId) {
  logToDebugSheet(`Creating next batch trigger for campaign '${campaignId}'.`);
  deleteCampaignTrigger(campaignId); // Use the safe delete function
  
  // CRITICAL FIX: Set the active campaign ID so the triggered function knows what to process.
  PropertiesService.getScriptProperties().setProperty('activeCampaignId', campaignId);

  const trigger = ScriptApp.newTrigger('processBatch')
    .timeBased()
    .after(1 * 60 * 1000)
    .create();
    
  // Store the new trigger's ID so we can delete it specifically later.
  PropertiesService.getScriptProperties().setProperty(`campaign_trigger_${campaignId}`, trigger.getUniqueId());

  logToDebugSheet(`Trigger created for campaign ${campaignId} with ID: ${trigger.getUniqueId()}`);
  Logger.log('Trigger created for the next batch in 1 minute.');
}

function deleteCampaignTrigger(campaignId) {
  const properties = PropertiesService.getScriptProperties();
  const triggerId = properties.getProperty(`campaign_trigger_${campaignId}`);

  if (triggerId) {
    logToDebugSheet(`Attempting to delete trigger for campaign '${campaignId}' (ID: ${triggerId})`);
    const allTriggers = ScriptApp.getProjectTriggers();
    let triggerFound = false;
    for (const trigger of allTriggers) {
      if (trigger.getUniqueId() === triggerId) {
    ScriptApp.deleteTrigger(trigger);
        triggerFound = true;
        logToDebugSheet(`Successfully deleted trigger ID: ${triggerId}`);
        break;
      }
    }
    if (!triggerFound) {
      logToDebugSheet(`Trigger ID ${triggerId} was in properties but not found in active triggers. It might have been manually deleted.`);
    }
    // Clean up the property regardless.
    properties.deleteProperty(`campaign_trigger_${campaignId}`);
  } else {
    logToDebugSheet(`No trigger ID found in properties for campaign '${campaignId}'. Nothing to delete.`);
  }
}

function completeCampaign(campaignId) {
  logToDebugSheet(`--- Function Start --- Completing campaign '${campaignId}'.`);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const campaignSheet = ss.getSheetByName(SHEETS.CAMPAIGNS);
  const campaignCols = getHeaderIndexMap(campaignSheet);
  const campaigns = campaignSheet.getDataRange().getValues();

  for (let i = 1; i < campaigns.length; i++) {
    if (campaigns[i][campaignCols.Campaign_ID] === campaignId) {
      logToDebugSheet(`Found campaign '${campaignId}' to mark as complete.`);
      const queueSheet = ss.getSheetByName(SHEETS.QUEUE);
      const queueCols = getHeaderIndexMap(queueSheet);
      const queueData = queueSheet.getDataRange().getValues();

      const campaignJobs = queueData.filter(row => row[queueCols.Campaign_ID] === campaignId);
      const sentCount = campaignJobs.filter(row => row[queueCols.Status] === 'Sent').length;
      const totalInQueue = campaignJobs.length;
      
      campaignSheet.getRange(i + 1, campaignCols.Progress + 1).setValue(`${sentCount} / ${totalInQueue}`);
      campaignSheet.getRange(i + 1, campaignCols.Status + 1).setValue('Completed');
      updateCampaignProperty(campaignId, 'Notes', `Campaign completed. Total sent: ${sentCount}.`);
      logToDebugSheet(`Campaign '${campaignId}' has been marked as 'Completed'. Progress: ${sentCount} / ${totalInQueue}.`);
      Logger.log(`Campaign ${campaignId} has been marked as 'Completed'.`);
      
      // --- UNLOCKING MECHANISM ---
      const rangeToUnlock = campaignSheet.getRange(i + 1, 1, 1, campaignSheet.getLastColumn());
      rangeToUnlock.clearDataValidations();
      rangeToUnlock.setBackground('white');
      logToDebugSheet(`Campaign '${campaignId}' row has been unlocked.`);
      // --- END UNLOCKING MECHANISM ---
      break;
    }
  }
  
  deleteCampaignTrigger(campaignId);
  PropertiesService.getScriptProperties().deleteProperty('activeCampaignId');
  logToDebugSheet(`Deleted 'activeCampaignId' property.`);
}


// --- WATCHDOG FUNCTIONS ---

/**
 * Creates persistent, time-based triggers for all system maintenance tasks (watchdog, sync).
 * This should be run once during setup from the menu.
 */
function createSystemTriggers() {
  // First, delete any existing system triggers to avoid duplicates.
  const triggers = ScriptApp.getProjectTriggers();
  const systemFunctions = ['checkStalledCampaigns', 'syncSuppressionsFromSendGrid'];
  for (const trigger of triggers) {
    const handler = trigger.getHandlerFunction();
    if (systemFunctions.includes(handler)) {
      ScriptApp.deleteTrigger(trigger);
    }
  }
  
  // --- Create Watchdog Trigger (every hour) ---
  ScriptApp.newTrigger('checkStalledCampaigns')
    .timeBased()
    .everyHours(1)
    .create();
  logToDebugSheet('Watchdog trigger created successfully. It will run every hour.');
    
  // --- Create SendGrid Sync Trigger (every day) ---
  ScriptApp.newTrigger('syncSuppressionsFromSendGrid')
    .timeBased()
    .atHour(3) // Runs between 3 AM and 4 AM every day
    .everyDays(1)
    .create();
  logToDebugSheet('SendGrid suppression sync trigger created successfully. It will run daily between 3-4 AM.');
    
  SpreadsheetApp.getUi().alert('Success! System triggers (Watchdog & Daily SendGrid Sync) have been set up. They will run automatically.');
}

/**
 * A watchdog function that runs periodically to find and restart stalled campaigns.
 */
function checkStalledCampaigns() {
  logToDebugSheet('--- Watchdog: Checking for stalled campaigns... ---');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const campaignSheet = ss.getSheetByName(SHEETS.CAMPAIGNS);
  const campaignCols = getHeaderIndexMap(campaignSheet);
  const campaigns = campaignSheet.getDataRange().getValues();
  const now = new Date();
  
  for (let i = 1; i < campaigns.length; i++) {
    const campaignId = String(campaigns[i][campaignCols.Campaign_ID]).trim();
    const status = campaigns[i][campaignCols.Status];
    const lastProcessed = new Date(campaigns[i][campaignCols.Last_Processed_At]);
    
    if (status === 'Running' && (now.getTime() - lastProcessed.getTime()) > (60 * 60 * 1000)) { // Stalled for > 1 hour
      logToDebugSheet(`Watchdog found stalled campaign: ${campaignId}. Last processed at ${lastProcessed.toLocaleString()}`);
      
      const properties = PropertiesService.getScriptProperties();
      const triggerId = properties.getProperty(`campaign_trigger_${campaignId}`);
      
      if (triggerId) {
        let triggerExists = false;
        const allTriggers = ScriptApp.getProjectTriggers();
        for (const trigger of allTriggers) {
          if (trigger.getUniqueId() === triggerId) {
            triggerExists = true;
            break;
          }
        }
        if (triggerExists) {
          logToDebugSheet(`Campaign ${campaignId} has an active trigger (ID: ${triggerId}). No action needed.`);
          continue;
        }
      }
      
      // If we are here, the campaign is stalled and has no trigger. Restart it.
      logToDebugSheet(`No active trigger found for stalled campaign ${campaignId}. Restarting process...`);
      updateCampaignProperty(campaignId, 'Notes', 'Watchdog detected stalled process. Restarting...');
      PropertiesService.getScriptProperties().setProperty('activeCampaignId', campaignId);
      createNextBatchTrigger(campaignId);
    }
  }
  logToDebugSheet('--- Watchdog: Check complete. ---');
}


// --- WARMUP MANAGEMENT UI ---

/**
 * Provides a user interface to view and manage the automatic warmup status.
 */
function manageWarmup() {
  const properties = PropertiesService.getScriptProperties();
  const ui = SpreadsheetApp.getUi();
  const isWarmupEnabled = properties.getProperty('warmup_enabled') !== 'false'; // Enabled by default

  let title = 'Manage Automatic Warmup';
  let body = '';
  let buttons = [];

  if (isWarmupEnabled) {
    // --- UI when Warmup is ENABLED ---
    const { reputationAgeInDays, dailyLimit } = getWarmupStatus(properties);
    body = `🟢 AUTOMATIC WARMUP IS CURRENTLY ENABLED\n\n` +
           `The system is on Day ${reputationAgeInDays} of the warmup schedule.\n` +
           `Today's total sending limit is ${dailyLimit} emails.\n\n` +
           `------------------------------------------\n` +
           `CHOOSE AN ACTION:\n` +
           `  • To Disable Warmup, click [ YES ]\n` +
           `  • To Force Restart Warmup, click [ NO ]`;
    
    const response = ui.alert(title, body, ui.ButtonSet.YES_NO_CANCEL);

    if (response === ui.Button.YES) { // Disable Warmup
        properties.setProperty('warmup_enabled', 'false');
        ui.alert('Success! Automatic warmup has been disabled. The maximum daily sending limit will now be used.');
        logToDebugSheet('Warmup DISABLED by user.');
    } else if (response === ui.Button.NO) { // Force Restart
        properties.setProperty('warmup_first_send_date', new Date().toISOString());
        ui.alert('Success! Warmup has been force-restarted. The sending limit will start from Day 1.');
        logToDebugSheet('Warmup force-restarted by user.');
    }

  } else {
    // --- UI when Warmup is DISABLED ---
    const maxLimit = MAX_DAILY_SENDS_POST_WARMUP; // Use the constant
    body = `🔴 AUTOMATIC WARMUP IS CURRENTLY DISABLED\n\n` +
           `The system is sending emails using the maximum daily limit (${maxLimit} emails).\n\n` +
           `------------------------------------------\n` +
           `CHOOSE AN ACTION:\n` +
           `  • To Enable Warmup, click [ YES ]`;
           
    const response = ui.alert(title, body, ui.ButtonSet.YES_NO_CANCEL);
    
    if (response === ui.Button.YES) { // Enable Warmup
        properties.setProperty('warmup_enabled', 'true');
        ui.alert('Success! Automatic warmup has been enabled. The system will now follow the recommended sending schedule.');
        logToDebugSheet('Warmup ENABLED by user.');
    }
  }
}

/**
 * Calculates the current warmup status (reputation age and daily limit).
 * This function centralizes the logic for reuse in manageWarmup and processBatch.
 * @param {GoogleAppsScript.Properties.Properties} properties The script properties object, passed to avoid re-fetching.
 * @param {number} [forcedAge] Optional. A specific reputation age to use for calculation instead of the real one.
 * @return {Object} An object containing { reputationAgeInDays, dailyLimit }.
 */
function getWarmupStatus(properties, forcedAge) {
  const WARMUP_SCHEDULE = [
    50, 100, 500, 1000, 2000, 4000, 8000, 16000, 25000, 35000, 
    50000, 75000, 100000, 150000, 200000, 275000, 375000, 500000, 
    650000, 825000, 1000000
  ];
  
  const today = new Date();
  
  // Check for a force-restarted date first
  let firstSendDateStr = properties.getProperty('warmup_first_send_date');
  
  if (!firstSendDateStr) {
    // If not restarted, find the actual first send date from logs
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName(SHEETS.LOGS);
    const logs = logSheet.getDataRange().getValues();
    let firstSendDate = null;
    for (let i = logs.length - 1; i >= 1; i--) {
      const timestamp = new Date(logs[i][0]);
      if (timestamp && !isNaN(timestamp)) {
        if (!firstSendDate || timestamp < firstSendDate) {
          firstSendDate = timestamp;
        }
      }
    }
    if (firstSendDate) {
      firstSendDateStr = firstSendDate.toISOString();
    }
  }

  let dailyLimit;
  let reputationAgeInDays = 1;
  
  if (!firstSendDateStr) {
    dailyLimit = WARMUP_SCHEDULE[0]; // Day 1 limit
  } else {
    const firstSendDate = new Date(firstSendDateStr);
    reputationAgeInDays = forcedAge || Math.floor((today - firstSendDate) / (1000 * 60 * 60 * 24)) + 1;
    if (reputationAgeInDays - 1 < WARMUP_SCHEDULE.length) {
      dailyLimit = WARMUP_SCHEDULE[reputationAgeInDays - 1];
    } else {
      dailyLimit = MAX_DAILY_SENDS_POST_WARMUP;
    }
  }
  
  return { reputationAgeInDays, dailyLimit };
}
