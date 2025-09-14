// /Config.gs (FINAL P1 VERSION - REVISED)

// --- Sheet Name Configuration ---
const SHEETS = {
  CAMPAIGNS: '📖 Campaigns',
  TEMPLATES: '📝 Templates',
  AUDIENCE: '👥 Target Audience',
  SETTINGS: '⚙️ Settings',
  QUEUE: '▶️ Queue',
  LOGS: '📜 Logs',
  DO_NOT_CONTACT: '🚫 Do Not Contact',
  ENGAGEMENT_LOGS: '📈 Engagement Logs' // New Sheet
};

// --- SendGrid API Key Management ---

/**
 * Prompts the user to enter their SendGrid API key and stores it securely in Script Properties.
 */
function setSendGridApiKey() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Set SendGrid API Key',
    'Please enter your SendGrid API key. This will be stored securely and will not be visible in the code.',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() == ui.Button.OK) {
    const apiKey = response.getResponseText();
    if (apiKey && apiKey.trim() !== '') {
      PropertiesService.getScriptProperties().setProperty('SENDGRID_API_KEY', apiKey);
      ui.alert('Success! SendGrid API key has been saved successfully.');
      logToDebugSheet('SendGrid API key has been set.');
    } else {
      ui.alert('Error: API key cannot be empty.');
      logToDebugSheet('Attempted to set an empty SendGrid API key.');
    }
  }
}

/**
 * Retrieves the SendGrid API key from Script Properties.
 * @return {string | null} The API key or null if not found.
 */
function getSendGridApiKey() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('SENDGRID_API_KEY');
  if (!apiKey) {
    logToDebugSheet('CRITICAL: SendGrid API Key is not set. Emails cannot be sent.');
  }
  return apiKey;
}
