// /Reset.gs

/**
 * This function completely wipes all stored properties.
 * It's a hard reset button for our script.
 */
function hardReset() {
  logToDebugSheet(`--- HARD RESET INITIATED ---`);
  // Deletes script-wide properties (like SendGrid API Key)
  PropertiesService.getScriptProperties().deleteAllProperties();
  logToDebugSheet(`Deleted all script properties.`);
  
  // User properties are no longer used for OAuth, so this is just for cleanup.
  PropertiesService.getUserProperties().deleteAllProperties();
  logToDebugSheet(`Deleted all user properties.`);
  
  Logger.log('🔥🔥🔥 All properties and authentication tokens have been wiped. Ready for a fresh start. 🔥🔥🔥');
}
