
/**
 * A collection of functions for interacting with the SendGrid API,
 * specifically for managing suppression lists (bounces, spam reports, etc.).
 */

/**
 * The main function to synchronize all suppression lists from SendGrid.
 * It fetches bounces, blocks, and spam reports and updates the local Google Sheets.
 */
function syncSuppressionsFromSendGrid() {
  logToDebugSheet('--- Starting SendGrid Suppression Sync ---');
  const allEmailsToSuppress = new Map();

  // Fetch all types of suppressions from SendGrid
  const suppressionTypes = ['bounces', 'blocks', 'spam_reports', 'invalid_emails'];
  for (const type of suppressionTypes) {
    const emails = fetchSendGridSuppressionList(type);
    for (const emailData of emails) {
      if (!allEmailsToSuppress.has(emailData.email)) {
        allEmailsToSuppress.set(emailData.email, {
          email: emailData.email,
          reason: `SendGrid ${type.slice(0, -1)}: ${emailData.reason || 'N/A'}`,
          timestamp: new Date(emailData.created * 1000)
        });
      }
    }
  }

  if (allEmailsToSuppress.size > 0) {
    logToDebugSheet(`Found a total of ${allEmailsToSuppress.size} unique emails to suppress.`);
    updateLocalSuppressionLists(Array.from(allEmailsToSuppress.values()));
  } else {
    logToDebugSheet('No new suppressions found in SendGrid.');
  }
  logToDebugSheet('--- SendGrid Suppression Sync Finished ---');
  SpreadsheetApp.getUi().alert(`Suppression sync complete. Found ${allEmailsToSuppress.size} new entries to update.`);
}

/**
 * Fetches a specific suppression list from the SendGrid API.
 * @param {string} type The type of list to fetch (e.g., 'bounces', 'blocks').
 * @return {Array} An array of email data objects from the API.
 */
function fetchSendGridSuppressionList(type) {
  logToDebugSheet(`Fetching SendGrid suppression list for: ${type}`);
  const apiKey = getSendGridApiKey();
  if (!apiKey) {
    logToDebugSheet(`Cannot fetch suppressions: SendGrid API Key is not set.`);
    return [];
  }

  const url = `https://api.sendgrid.com/v3/suppression/${type}`;
  const options = {
    method: 'get',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 200) {
      const data = JSON.parse(responseBody);
      logToDebugSheet(`Successfully fetched ${data.length} entries from SendGrid for ${type}.`);
      return data;
    } else {
      logToDebugSheet(`Failed to fetch ${type} list. Code: ${responseCode}, Body: ${responseBody}`);
      return [];
    }
  } catch (e) {
    logToDebugSheet(`CRITICAL ERROR in fetchSendGridSuppressionList for ${type}: ${e.toString()}`);
    return [];
  }
}

/**
 * Updates the '🚫 Do Not Contact' and '👥 Target Audience' sheets with a list of suppressed emails.
 * @param {Array<Object>} emailsToUpdate An array of objects, each with email, reason, and timestamp.
 */
function updateLocalSuppressionLists(emailsToUpdate) {
  logToDebugSheet(`Updating local sheets with ${emailsToUpdate.length} emails.`);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dncSheet = ss.getSheetByName(SHEETS.DO_NOT_CONTACT);
  const audienceSheet = ss.getSheetByName(SHEETS.AUDIENCE);

  // Get existing DNC emails to avoid duplicates
  const dncData = dncSheet.getDataRange().getValues();
  const dncEmails = new Set(dncData.map(row => row[0]));

  const newDncRows = [];
  for (const item of emailsToUpdate) {
    if (!dncEmails.has(item.email)) {
      newDncRows.push([item.email, item.reason, item.timestamp]);
      dncEmails.add(item.email); // Add to set to handle duplicates within the new list
    }
  }

  if (newDncRows.length > 0) {
    dncSheet.getRange(dncSheet.getLastRow() + 1, 1, newDncRows.length, 3).setValues(newDncRows);
    logToDebugSheet(`Added ${newDncRows.length} new emails to the '🚫 Do Not Contact' sheet.`);
  }

  // Update the status in the Target Audience sheet
  const audienceData = audienceSheet.getDataRange().getValues();
  const audienceCols = getHeaderIndexMap(audienceSheet);
  const audienceEmailCol = audienceCols.Email;
  const audienceStatusCol = audienceCols.Email_Status;
  
  let updatedAudienceCount = 0;
  for (let i = 1; i < audienceData.length; i++) {
    const email = audienceData[i][audienceEmailCol];
    if (dncEmails.has(email) && audienceData[i][audienceStatusCol] !== 'Bounced') { // Check against the full set
      audienceSheet.getRange(i + 1, audienceStatusCol + 1).setValue('Bounced');
      updatedAudienceCount++;
    }
  }
  if (updatedAudienceCount > 0) {
    logToDebugSheet(`Updated ${updatedAudienceCount} statuses in the '👥 Target Audience' sheet.`);
  }
}

// --- Real-time Webhook Handlers ---

/**
 * Processes an array of event objects from the SendGrid Event Webhook.
 * @param {Array<Object>} events The array of event objects.
 */
function handleSendGridWebhook(events) {
  logToDebugSheet(`Processing ${events.length} event(s) from SendGrid Webhook.`);
  const emailsToSuppress = new Map();
  const engagementEvents = [];
  
  const suppressionEventTypes = ['bounce', 'dropped', 'spamreport', 'unsubscribe'];
  const engagementEventTypes = ['open', 'click'];

  for (const event of events) {
    // Handle Suppression Events
    if (suppressionEventTypes.includes(event.event)) {
      if (!emailsToSuppress.has(event.email)) {
        emailsToSuppress.set(event.email, {
          email: event.email,
          reason: `SendGrid Webhook: ${event.event} - ${event.reason || 'N/A'}`,
          timestamp: new Date(event.timestamp * 1000)
        });
      }
    }
    // Handle Engagement Events
    else if (engagementEventTypes.includes(event.event)) {
      const campaignId = (event.category && Array.isArray(event.category)) ? event.category[0] : 'N/A';
      engagementEvents.push([
        new Date(event.timestamp * 1000),
        campaignId,
        event.email,
        event.event,
        event.url || 'N/A' // URL is only present for click events
      ]);
    }
  }

  if (emailsToSuppress.size > 0) {
    logToDebugSheet(`Found ${emailsToSuppress.size} relevant suppression events from webhook.`);
    updateLocalSuppressionLists(Array.from(emailsToSuppress.values()));
  }

  if (engagementEvents.length > 0) {
    logToDebugSheet(`Found ${engagementEvents.length} engagement events from webhook.`);
    logEngagementEvents(engagementEvents);
  }
}

/**
 * Logs engagement events (like opens and clicks) to the '📈 Engagement Logs' sheet.
 * @param {Array<Array>} rows The rows of data to append to the sheet.
 */
function logEngagementEvents(rows) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEETS.ENGAGEMENT_LOGS);
    if (!sheet) {
      sheet = ss.insertSheet(SHEETS.ENGAGEMENT_LOGS, 0);
      sheet.appendRow(['Timestamp', 'Campaign_ID', 'Recipient_Email', 'Event', 'URL_Clicked']);
    }
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    logToDebugSheet(`Successfully logged ${rows.length} engagement events.`);
  } catch (e) {
    logToDebugSheet(`CRITICAL ERROR in logEngagementEvents: ${e.toString()}`);
  }
}
