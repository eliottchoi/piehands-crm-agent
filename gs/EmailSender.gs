// /EmailSender.gs

/**
 * Sends an email using the SendGrid API.
 * This function replaces the previous Gmail API implementation.
 * @param {string} senderEmail The email address of the sender (must be a verified sender in SendGrid).
 * @param {string} to The recipient's email address.
 * @param {string} subject The email subject.
 * @param {string} body The HTML body of the email.
 * @param {string} campaignId The ID of the campaign, used for tracking.
 * @return {object} An object indicating the result, e.g., { success: true, details: 'Accepted' }
 */
function sendEmail(senderEmail, to, subject, body, campaignId) {
  logToDebugSheet(`Attempting to send email via SendGrid from ${senderEmail} to ${to} for campaign ${campaignId}`);
  // const apiKey = getSendGridApiKey();
      
  return { success: true, messageId: 'DRY_RUN_SUCCESS', details: 'This is a dry run test.' };

  if (!apiKey) {
    const errorMsg = "SendGrid API Key is not configured.";
    logToDebugSheet(`Send failed: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
  
  // Basic validation
  if (!to || !to.includes('@')) {
      const errorMsg = `Invalid recipient email address: ${to}`;
      logToDebugSheet(`Send failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
  }

  const sendGridApiUrl = 'https://api.sendgrid.com/v3/mail/send';

  const payload = {
    personalizations: [{
      to: [{ email: to }]
    }],
    from: { email: senderEmail },
    subject: subject,
    content: [{
      type: 'text/html',
      value: body
    }],
    categories: [campaignId] // Add campaign_id for tracking in webhooks
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true // IMPORTANT: Allows us to handle non-2xx responses gracefully
  };

  try {
    const response = UrlFetchApp.fetch(sendGridApiUrl, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    // SendGrid returns a 202 Accepted status on success.
    if (responseCode === 202) {
      logToDebugSheet(`Successfully sent email to ${to}. SendGrid accepted the request.`);
      // Message ID is not available in the direct response, so we log a generic success message.
      return { success: true, messageId: 'N/A (SendGrid)', details: `SendGrid accepted request for ${to}.` };
    } else {
      logToDebugSheet(`Failed to send email to ${to}. Response Code: ${responseCode}, Body: ${responseBody}`);
      return { success: false, error: `SendGrid API Error: ${responseCode} - ${responseBody}` };
    }
  } catch (e) {
    logToDebugSheet(`CRITICAL ERROR while sending email to ${to}: ${e.toString()}`);
    return { success: false, error: e.toString() };
  }
}

