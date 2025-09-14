// /Main.gs

function onOpen() {
  logToDebugSheet(`onOpen triggered. Creating static menu.`);
  
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu('✨ Popow CRM');

  // Campaign Management Sub-Menu
  const campaignMenu = ui.createMenu('Campaigns');
  campaignMenu.addItem('▶️ Activate Selected Campaign', 'activateCampaignManually');
  campaignMenu.addItem('🚀 Activate & Send (No Approval)', 'activateAndSendWithoutApproval');
  campaignMenu.addSeparator();
  campaignMenu.addItem('⏸️ Pause Selected Campaign', 'pauseCampaign');
  campaignMenu.addItem('▶️ Resume Selected Campaign', 'resumeCampaign');
  campaignMenu.addItem('❌ Cancel Selected Campaign', 'cancelCampaignManually');
  menu.addSubMenu(campaignMenu);
  menu.addSeparator();

  // System Settings Sub-Menu
  const systemMenu = ui.createMenu('System');
  systemMenu.addItem('⚙️ Manage Warmup', 'manageWarmup');
  systemMenu.addItem('🔑 Set/Change SendGrid API Key', 'setSendGridApiKey');
  systemMenu.addItem('⏰ Setup System Triggers', 'createSystemTriggers');
  systemMenu.addSeparator();
  systemMenu.addItem('🔥 Hard Reset...', 'hardResetConfirmation');
  menu.addSubMenu(systemMenu);
  menu.addSeparator();

  // Tools Sub-Menu
  const toolsMenu = ui.createMenu('Tools');
  toolsMenu.addItem('🩺 Check System Health', 'checkSystemHealth');
  toolsMenu.addItem('🔄 Sync Suppressions from SendGrid', 'syncSuppressionsFromSendGrid');
  menu.addSubMenu(toolsMenu);

  menu.addToUi();
}


/**
 * A confirmation step before performing a hard reset.
 */
function hardResetConfirmation() {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
        '🔥 CONFIRM HARD RESET 🔥',
        'Are you absolutely sure you want to perform a hard reset?\n\nThis will delete ALL script properties, including your saved SendGrid API Key. This action cannot be undone.',
        ui.ButtonSet.YES_NO
    );

    if (response === ui.Button.YES) {
        hardReset(); // This function is in Reset.gs
    }
}


function activateCampaignManually() {
  handleCampaignActivation(true);
}

function activateAndSendWithoutApproval() {
  handleCampaignActivation(false);
}

function handleCampaignActivation(requireApproval) {
  logToDebugSheet(`--- Function Start --- Approval Required: ${requireApproval}`);
  Logger.log(`--- [START] handleCampaignActivation (Approval Required: ${requireApproval}) ---`);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const campaignSheet = ss.getSheetByName(SHEETS.CAMPAIGNS);
    const campaignCols = getHeaderIndexMap(campaignSheet);
    const activeRow = campaignSheet.getActiveRange().getRow();

    if (activeRow < 2) {
      logToDebugSheet(`Activation failed: No valid campaign row selected (row ${activeRow}).`);
      SpreadsheetApp.getUi().alert('Please select a valid campaign row.');
      return;
    }
    
    const campaignData = campaignSheet.getRange(activeRow, 1, 1, campaignSheet.getLastColumn()).getValues()[0];
    const campaignId = campaignData[campaignCols.Campaign_ID];
    const campaignName = campaignData[campaignCols.Campaign_Name];
    const status = campaignData[campaignCols.Status];
    const targetTag = campaignData[campaignCols.Target_Tag];
    const senderEmail = campaignData[campaignCols.Sender_Email];
    const templateName = campaignData[campaignCols.Template_Name];

    // --- PROACTIVE AUTH CHECK (NO LONGER NEEDED FOR OAUTH) ---
    // Switched to a check for the SendGrid API Key instead.
    logToDebugSheet(`Proactively checking for SendGrid API Key.`);
    const sendGridKey = getSendGridApiKey();
    if (!sendGridKey) {
      const errorMsg = `SendGrid API Key is not set. Please use the 'Piehands CRM > Set SendGrid API Key' menu to set it before activating a campaign.`;
      logToDebugSheet(`Activation failed: ${errorMsg}`);
      SpreadsheetApp.getUi().alert(errorMsg);
      return;
    }
    logToDebugSheet(`SendGrid API Key is present.`);
    // --- END PROACTIVE CHECK ---

    if (status.toLowerCase() !== 'draft') {
      logToDebugSheet(`Activation failed: Campaign status is '${status}', not 'Draft'.`);
      SpreadsheetApp.getUi().alert('This campaign is not in Draft status.');
      return;
    }
    if (!senderEmail) {
      logToDebugSheet(`Activation failed: Sender Email is not set.`);
      SpreadsheetApp.getUi().alert('Please select a Sender Email for this campaign.');
      return;
    }

    // --- REVISED ACTIVATION FLOW TO PREVENT RACE CONDITIONS ---
    // 1. Immediately set the status to Pending_Approval to lock it in.
    campaignSheet.getRange(activeRow, campaignCols.Status + 1).setValue('Pending_Approval');
    updateCampaignProperty(campaignId, 'Notes', 'Generating email queue...');
    logToDebugSheet(`Set campaign ${campaignId} status to 'Pending_Approval' early to prevent race conditions.`);

    // 2. Create the queue (this can take time).
    const queueResult = createQueueForCampaign(campaignId, targetTag, templateName, senderEmail);
    const queueCount = queueResult.count;
    const firstJobData = queueResult.firstJobData;
    
    // 3. Lock the row visually and functionally.
    const rangeToLock = campaignSheet.getRange(activeRow, 1, 1, campaignSheet.getLastColumn());
    // Use a custom formula that effectively prevents any user input.
    // This method avoids showing validation errors on cells that already have content.
    const rule = SpreadsheetApp.newDataValidation()
        .setAllowInvalid(false)
        .requireFormulaSatisfied('=ISBLANK(INDIRECT(ADDRESS(ROW(), COLUMN())))') 
        .setHelpText(`This campaign is currently active and cannot be edited.`)
        .build();
    rangeToLock.setDataValidation(rule);
    rangeToLock.setBackground('#f3f3f3'); // Light grey
    logToDebugSheet(`Campaign row ${activeRow} has been locked using data validation and color.`);
    
    // 4. Update progress and send notification.
    campaignSheet.getRange(activeRow, campaignCols.Progress + 1).setValue(`0 / ${queueCount}`);
    
    if (requireApproval) {
      updateCampaignProperty(campaignId, 'Notes', `Waiting for Slack approval. ${queueCount} emails queued.`);
      sendApprovalRequestToSlack(campaignId, campaignName, targetTag, queueCount, senderEmail, firstJobData);
      logToDebugSheet(`Approval request sent for campaign ${campaignId}.`);
    } else {
      // If no approval is needed, change status to Running and start.
      campaignSheet.getRange(activeRow, campaignCols.Status + 1).setValue('Running');
      updateCampaignProperty(campaignId, 'Notes', `Campaign started immediately. ${queueCount} emails queued.`);
      createNextBatchTrigger(campaignId);
      logToDebugSheet(`Campaign ${campaignId} activated and set to 'Running' immediately.`);
    }
    // --- END REVISED FLOW ---

  } catch (e) {
    logToDebugSheet(`CRITICAL ERROR: ${e.toString()}`);
    Logger.log(`!!-- [ERROR] in handleCampaignActivation: ${e.toString()} --!!`);
    SpreadsheetApp.getUi().alert(`An error occurred: ${e.message}`);
  }
}

function pauseCampaign() {
  logToDebugSheet(`--- Function Start: Pause Campaign ---`);
  const ui = SpreadsheetApp.getUi();
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const campaignSheet = ss.getSheetByName(SHEETS.CAMPAIGNS);
    const campaignCols = getHeaderIndexMap(campaignSheet);
    const activeRow = campaignSheet.getActiveRange().getRow();

    if (activeRow < 2) {
      ui.alert('Please select a valid campaign row to pause.');
      return;
    }

    const campaignData = campaignSheet.getRange(activeRow, 1, 1, campaignSheet.getLastColumn()).getValues()[0];
    const campaignId = campaignData[campaignCols.Campaign_ID];
    const status = campaignData[campaignCols.Status];

    const pausableStatuses = ['Running', 'Processing'];
    if (!pausableStatuses.includes(status)) {
      ui.alert(`This campaign cannot be paused. Its status is: ${status}`);
      return;
    }

    deleteCampaignTrigger(campaignId); // Immediately delete the next trigger
    updateCampaignProperty(campaignId, 'Status', 'Paused');
    updateCampaignProperty(campaignId, 'Notes', 'Paused by user.');
    logToDebugSheet(`Campaign ${campaignId} has been paused.`);
    ui.alert(`Campaign "${campaignId}" has been successfully paused.`);

  } catch (e) {
    logToDebugSheet(`CRITICAL ERROR in pauseCampaign: ${e.toString()}`);
    ui.alert(`An error occurred: ${e.message}`);
  }
}

function resumeCampaign() {
  logToDebugSheet(`--- Function Start: Resume Campaign ---`);
  const ui = SpreadsheetApp.getUi();
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const campaignSheet = ss.getSheetByName(SHEETS.CAMPAIGNS);
    const campaignCols = getHeaderIndexMap(campaignSheet);
    const activeRow = campaignSheet.getActiveRange().getRow();

    if (activeRow < 2) {
      ui.alert('Please select a valid campaign row to resume.');
      return;
    }

    const campaignData = campaignSheet.getRange(activeRow, 1, 1, campaignSheet.getLastColumn()).getValues()[0];
    const campaignId = campaignData[campaignCols.Campaign_ID];
    const status = campaignData[campaignCols.Status];

    if (status !== 'Paused') {
      ui.alert(`This campaign cannot be resumed. Its status is: ${status}`);
      return;
    }

    updateCampaignProperty(campaignId, 'Status', 'Running');
    updateCampaignProperty(campaignId, 'Notes', 'Resumed by user. The next batch will process shortly.');
    createNextBatchTrigger(campaignId); // Immediately create a new trigger
    logToDebugSheet(`Campaign ${campaignId} has been resumed.`);
    ui.alert(`Campaign "${campaignId}" has been successfully resumed. Processing will continue in about 1 minute.`);

  } catch (e) {
    logToDebugSheet(`CRITICAL ERROR in resumeCampaign: ${e.toString()}`);
    ui.alert(`An error occurred: ${e.message}`);
  }
}

function cancelCampaignManually() {
  logToDebugSheet(`--- Function Start ---`);
  Logger.log('--- [START] cancelCampaignManually ---');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const campaignSheet = ss.getSheetByName(SHEETS.CAMPAIGNS);
  const campaignCols = getHeaderIndexMap(campaignSheet);
  const activeRow = campaignSheet.getActiveRange().getRow();

  if (activeRow < 2) {
    logToDebugSheet(`Cancellation failed: No valid campaign row selected (row ${activeRow}).`);
    SpreadsheetApp.getUi().alert('Please select a valid campaign row to cancel.');
    return;
  }

  const campaignData = campaignSheet.getRange(activeRow, 1, 1, campaignSheet.getLastColumn()).getValues()[0];
  const campaignId = campaignData[campaignCols.Campaign_ID];
  const status = campaignData[campaignCols.Status];

  const cancellableStatuses = ['Running', 'Paused', 'Pending_Approval', 'Processing'];
  if (!cancellableStatuses.includes(status)) {
     logToDebugSheet(`Cancellation failed: Campaign status is '${status}'.`);
     SpreadsheetApp.getUi().alert(`This campaign cannot be canceled. Its status is: ${status}`);
     return;
  }

  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('Confirm Cancellation', `Are you sure you want to cancel campaign "${campaignId}"? This will delete all unsent emails from the queue. This action cannot be undone.`, ui.ButtonSet.YES_NO);

  if (response == ui.Button.YES) {
    // --- OPTIMIZED QUEUE DELETION ---
    const queueSheet = ss.getSheetByName(SHEETS.QUEUE);
    const queueCols = getHeaderIndexMap(queueSheet);
    const queueData = queueSheet.getDataRange().getValues();
    
    const keptRows = [queueData[0]]; // Start with the header row
    let deletedCount = 0;

    for (let i = 1; i < queueData.length; i++) {
      const row = queueData[i];
      const rowCampaignId = String(row[queueCols.Campaign_ID]).trim();
      const rowStatus = row[queueCols.Status];

      // Keep rows that are NOT pending for the cancelled campaign
      if (!(rowCampaignId === String(campaignId).trim() && rowStatus === 'Pending')) {
        keptRows.push(row);
      } else {
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      queueSheet.getDataRange().clearContent(); // Clear the entire sheet
      if (keptRows.length > 0) {
        queueSheet.getRange(1, 1, keptRows.length, keptRows[0].length).setValues(keptRows);
      }
    }
    logToDebugSheet(`${deletedCount} pending jobs deleted for campaign ${campaignId}.`);
    Logger.log(`${deletedCount} pending jobs deleted for campaign ${campaignId}.`);
    // --- END OPTIMIZED QUEUE DELETION ---

    // 2. Stop any running triggers
    deleteCampaignTrigger(campaignId);

    // 3. Unlock the campaign row (Data Validation and Color)
    const rangeToUnlock = campaignSheet.getRange(activeRow, 1, 1, campaignSheet.getLastColumn());
    rangeToUnlock.clearDataValidations();
    rangeToUnlock.setBackground('white');
    logToDebugSheet(`Campaign ${campaignId} row has been unlocked.`);

    // 4. Update status to 'Canceled'
    campaignSheet.getRange(activeRow, campaignCols.Status + 1).setValue('Canceled');
    updateCampaignProperty(campaignId, 'Notes', 'Campaign canceled by user.');
    logToDebugSheet(`Campaign ${campaignId} has been marked as 'Canceled'.`);
    Logger.log(`Campaign ${campaignId} has been marked as 'Canceled'.`);
    ui.alert('Campaign has been successfully canceled.');
  }
}

function doPost(e) {
  logToDebugSheet(`--- Function Start --- Received POST request.`);
  try {
    // --- ROUTER: Distinguish between Slack and SendGrid Webhook ---

    // Case 1: Request is from Slack (contains a 'payload' parameter)
    if (e && e.parameter && e.parameter.payload) {
      logToDebugSheet('Request identified as coming from Slack.');
      const payload = JSON.parse(decodeURIComponent(e.parameter.payload));
      const actionValue = payload.actions[0].value;
      const user = payload.user.name;

      Logger.log(`Parsed Slack action: ${actionValue} from user: ${user}`);
      logToDebugSheet(`Parsed Slack action: ${actionValue} from user: ${user}`);

      const parts = actionValue.split('_');
      const action = parts.shift(); // Takes the first element (e.g., "approve")
      const campaignId = parts.join('_'); // Joins the rest back together (e.g., "C_001")


      if (action === 'approve') {
        sendSimpleSlackMessage(`✅ Campaign *${campaignId}* has been approved by *${user}* and is now running.`);
        manuallyApproveAndStartSending(campaignId, user);
      } else if (action === 'cancel') {
        const campaignSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.CAMPAIGNS);
        const campaignCols = getHeaderIndexMap(campaignSheet);
        const data = campaignSheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          if (data[i][campaignCols.Campaign_ID] === campaignId) {
            logToDebugSheet(`Activating row ${i + 1} to manually cancel campaign ${campaignId}.`);
            sendSimpleSlackMessage(`❌ Campaign *${campaignId}* has been canceled by *${user}*.`);
            campaignSheet.getRange(i + 1, 1).activate();
            cancelCampaignManually();
            break;
          }
        }
      }
    // Case 2: Request is from SendGrid Webhook (contains postData.contents)
    } else if (e && e.postData && e.postData.contents) {
      logToDebugSheet('Request identified as coming from SendGrid Event Webhook.');
      const events = JSON.parse(e.postData.contents);
      handleSendGridWebhook(events);
    
    // Case 3: Unknown request type
    } else {
      logToDebugSheet(`Received an unknown or malformed POST request. Contents: ${JSON.stringify(e)}`);
    }

    // Always return a valid response to the caller (Slack, SendGrid, etc.)
    return ContentService.createTextOutput("Request received and processed.");

  } catch (err) {
    logToDebugSheet(`CRITICAL ERROR in doPost: ${err.toString()}`);
    // Step 4: If any error happens, log it and still return a valid response.
    const errorLog = `!!-- [ERROR] in doPost (Webhook): ${err.toString()} --!! Stack: ${err.stack}`;
    Logger.log(errorLog);
    return ContentService.createTextOutput("An error occurred but was logged.");
  }
}