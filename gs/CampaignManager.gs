// /CampaignManager.gs

function createQueueForCampaign(campaignId, targetTag, templateName, senderEmail) {
  logToDebugSheet(`--- Function Start --- Campaign ID: ${campaignId}, Target: ${targetTag}, Template: ${templateName}, Sender: ${senderEmail}`);
  Logger.log(`--- [START] createQueueForCampaign for Sender: ${senderEmail} ---`);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const audienceSheet = ss.getSheetByName(SHEETS.AUDIENCE);
    const audienceCols = getHeaderIndexMap(audienceSheet);
    const templateSheet = ss.getSheetByName(SHEETS.TEMPLATES);
    const templateCols = getHeaderIndexMap(templateSheet);
    const queueSheet = ss.getSheetByName(SHEETS.QUEUE);
    const dncSheet = ss.getSheetByName(SHEETS.DO_NOT_CONTACT);

    // This is a safety check in case a sheet is not found
    if (!audienceSheet || !templateSheet || !queueSheet || !dncSheet) {
      logToDebugSheet(`ERROR: One or more required sheets are missing.`);
      throw new Error("One or more required sheets are missing.");
    }

    const audienceData = audienceSheet.getDataRange().getValues();
    const templateData = templateSheet.getDataRange().getValues();
    const dncData = dncSheet.getDataRange().getValues();
    logToDebugSheet('All required sheets data loaded.');

    const dncList = new Set(dncData.slice(1).map(row => row[0]));
    logToDebugSheet(`Do Not Contact list created with ${dncList.size} entries.`);
    Logger.log(`Do Not Contact list created with ${dncList.size} entries.`);
    
    // --- DYNAMIC VARIABLE REPLACEMENT ---
    // Get all headers from the Target Audience sheet to be used as dynamic variables.
    const audienceHeaders = audienceData[0];
    
    let template = null;
    for (let i = 1; i < templateData.length; i++) {
      if (templateData[i][templateCols.Template_Name] === templateName) {
        template = {
          subject: templateData[i][templateCols.Subject],
          body: templateData[i][templateCols.Body]
        };
        logToDebugSheet(`Template "${templateName}" found.`);
        Logger.log(`Template "${templateName}" found.`);
        break;
      }
    }

    if (!template) {
      logToDebugSheet(`ERROR: Template named "${templateName}" not found.`);
      Logger.log(`!!-- [ERROR] Template named "${templateName}" not found. --!!`);
      throw new Error(`Template named "${templateName}" not found.`);
    }

    const queueJobs = [];
    
    let lastId = 0;
    const lastRow = queueSheet.getLastRow();
    if (lastRow > 1) {
      lastId = queueSheet.getRange(lastRow, 1).getValue();
    }
    let queueId = lastId;
    logToDebugSheet(`Starting to build queue. Last known Queue ID was ${queueId}.`);
    Logger.log(`Starting to build queue. Last known Queue ID was ${queueId}.`);

    for (let i = 1; i < audienceData.length; i++) {
      const audienceRow = audienceData[i];
      const audienceTag = audienceRow[audienceCols.Tag];

      if (audienceTag === targetTag && !dncList.has(audienceRow[audienceCols.Email])) {
        queueId++;
        
        let finalSubject = template.subject;
        let finalBody = template.body;

        // ROBUST DYNAMIC VARIABLE REPLACEMENT LOGIC
        // This is now case-insensitive and respects column order changes.
        for (const header of audienceHeaders) {
          if (header) { // Ensure header is not empty
            const value = audienceRow[audienceCols[header]]; // Use the map for safety
            // Case-insensitive replacement using RegExp
            const regex = new RegExp(`{{${header}}}`, 'gi'); 
            finalSubject = finalSubject.replace(regex, value);
            finalBody = finalBody.replace(regex, value);
          }
        }
        
        // The sender is now passed directly from the campaign settings, ensuring a single source of truth.
        queueJobs.push([
          queueId,
          campaignId,
          audienceRow[audienceCols.Creator_ID],
          audienceRow[audienceCols.Email],    // Recipient_Email
          senderEmail,      // Sender_Email (Passed from handleCampaignActivation)
          finalSubject,
          finalBody,
          'Pending',        // Status
          0,                // Retry_Count
          ''                // Log_Details
        ]);
      }
    }
    logToDebugSheet(`Finished building queue. ${queueJobs.length} new jobs to be added.`);
    Logger.log(`Finished building queue. ${queueJobs.length} new jobs to be added.`);

    if (queueJobs.length > 0) {
      queueSheet.getRange(queueSheet.getLastRow() + 1, 1, queueJobs.length, queueJobs[0].length).setValues(queueJobs);
      logToDebugSheet(`${queueJobs.length} jobs written to the Queue sheet.`);
      Logger.log('New jobs have been written to the Queue sheet.');
    }
    
    logToDebugSheet(`--- Function End --- Returning count: ${queueJobs.length}`);
    Logger.log('--- [END] createQueueForCampaign ---');
    return { 
      count: queueJobs.length, 
      firstJobData: queueJobs.length > 0 ? queueJobs[0] : null 
    };

  } catch (e) {
    logToDebugSheet(`CRITICAL ERROR: ${e.toString()}`);
    Logger.log(`!!-- [ERROR] in createQueueForCampaign: ${e.toString()} --!!`);
    throw e;
  }
}
