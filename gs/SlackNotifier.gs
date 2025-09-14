// /SlackNotifier.gs (REVISED WITH CONFIG & PREVIEW)

/**
 * Reads a specific setting value from the Settings sheet.
 * @param {string} settingName The name of the setting to retrieve.
 * @return {string | null} The value of the setting or null if not found.
 */
function getSetting(settingName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = ss.getSheetByName(SHEETS.SETTINGS);
  const settingsData = settingsSheet.getDataRange().getValues();
  
  for (let i = 1; i < settingsData.length; i++) {
    if (settingsData[i][0] === settingName) {
      return settingsData[i][1];
    }
  }
  Logger.log(`Setting "${settingName}" not found in Settings sheet.`);
  return null;
}


function sendApprovalRequestToSlack(campaignId, campaignName, targetTag, queueCount, senderEmail, firstJobData) {
  logToDebugSheet(`--- Function Start --- Sending Slack approval for Campaign ID: ${campaignId}`);
  Logger.log(`Sending Slack approval for Campaign ID: ${campaignId}`);
  
  const webhookUrl = getSetting('Slack_Webhook_URL');
  if (!webhookUrl) {
    logToDebugSheet(`CRITICAL: Slack Webhook URL not set in Settings. Notification cannot be sent.`);
    Logger.log('!!-- CRITICAL: Slack Webhook URL not set in Settings. Notification cannot be sent. --!!');
    return;
  }

  // --- NEW: Use actual first job data for a perfect preview ---
  let previewSubject = "N/A (No emails in queue)";
  let previewBody = "No recipients matched the target tag, so no emails were queued for this campaign.";
  let firstRecipient = "N/A";

  if (firstJobData) {
    const queueSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.QUEUE);
    const queueCols = getHeaderIndexMap(queueSheet);
    previewSubject = firstJobData[queueCols.Final_Subject];
    previewBody = firstJobData[queueCols.Final_Body];
    firstRecipient = firstJobData[queueCols.Recipient_Email];
  }
  // ---------------------------------------------
  
  // --- Calculate ETA ---
  const eta = calculateEta(queueCount);
  // ---------------------

  const message = {
    "text": `Campaign "${campaignName}" is ready for approval.`,
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `*Campaign Ready for Approval* \n A new campaign is ready to be sent.`
        }
      },
      { "type": "divider" },
      {
        "type": "section",
        "fields": [
          { "type": "mrkdwn", "text": `*Campaign ID:*\n${campaignId}` },
          { "type": "mrkdwn", "text": `*Campaign Name:*\n${campaignName}` },
          { "type": "mrkdwn", "text": `*Sender:*\n${senderEmail}` },
          { "type": "mrkdwn", "text": `*Target Tag:*\n${targetTag}` },
          { "type": "mrkdwn", "text": `*Total Emails:*\n${queueCount}` },
          { "type": "mrkdwn", "text": `*First Recipient:*\n${firstRecipient}` },
          { "type": "mrkdwn", "text": `*Est. Time to Complete:*\n${eta}` }
        ]
      },
      // --- NEW: Email Preview Block ---
      {
        "type": "context",
        "elements": [ { "type": "mrkdwn", "text": "📧 *Email Preview*" } ]
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `*Subject:* ${previewSubject}\n\n*Body:*\n>>>${previewBody}`
        }
      },
      // --------------------------------
      { "type": "divider" },
      {
        "type": "actions",
        "elements": [
          {
            "type": "button",
            "text": { "type": "plain_text", "text": "✅ Approve & Send" },
            "style": "primary",
            "value": `approve_${campaignId}`,
            "action_id": "approve_button"
          },
          {
            "type": "button",
            "text": { "type": "plain_text", "text": "❌ Cancel" },
            "style": "danger",
            "value": `cancel_${campaignId}`,
            "action_id": "cancel_button"
          }
        ]
      }
    ]
  };

  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(message)
  };

  try {
    UrlFetchApp.fetch(webhookUrl, options);
    logToDebugSheet('Slack notification sent successfully.');
    Logger.log('Slack notification sent successfully.');
  } catch (e) {
    logToDebugSheet(`FAILED to send Slack notification. Error: ${e.toString()}`);
    Logger.log(`!!-- FAILED to send Slack notification. Error: ${e.toString()} --!!`);
  }
}

/**
 * Sends a simple, one-line text message to the configured Slack webhook URL.
 * Used for status updates like approval or cancellation.
 * @param {string} text The message to send.
 */
function sendSimpleSlackMessage(text) {
  logToDebugSheet(`Sending simple Slack message: "${text}"`);
  const webhookUrl = getSetting('Slack_Webhook_URL');
  if (!webhookUrl) {
    logToDebugSheet(`CRITICAL: Slack Webhook URL not set. Cannot send simple message.`);
    return;
  }

  const message = { "text": text };
  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(message)
  };

  try {
    UrlFetchApp.fetch(webhookUrl, options);
  } catch (e) {
    logToDebugSheet(`FAILED to send simple Slack message. Error: ${e.toString()}`);
  }
}
