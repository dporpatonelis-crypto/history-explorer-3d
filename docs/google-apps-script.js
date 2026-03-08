/**
 * Google Apps Script — Sheet → JSON → GitHub
 * 
 * SETUP:
 * 1. Άνοιξε το Google Sheet σου
 * 2. Extensions → Apps Script
 * 3. Αντέγραψε αυτόν τον κώδικα
 * 4. Συμπλήρωσε τις μεταβλητές CONFIG
 * 5. Τρέξε pushToGitHub() ή βάλε trigger (π.χ. onEdit)
 *
 * SHEET STRUCTURE (3 tabs):
 *   Tab "characters": id | name | title | position_x | position_y | position_z | rotation | color | robeColor | description | glbModel
 *   Tab "dialogs":    character_id | question | answer
 *   Tab "facts":      character_id | fact
 *   Tab "screens":    left_image_url | right_image_url | left_label | right_label  (single row)
 */

const CONFIG = {
  GITHUB_TOKEN: '',           // GitHub Personal Access Token (repo scope)
  GITHUB_OWNER: '',           // π.χ. 'myusername'
  GITHUB_REPO: '',            // π.χ. 'my-lovable-project'
  GITHUB_BRANCH: 'main',     // ή 'master'
  FILE_PATH: 'public/scenarios/default.json',

  // Ονόματα tabs στο Sheet
  CHARACTERS_TAB: 'characters',
  DIALOGS_TAB: 'dialogs',
  FACTS_TAB: 'facts',
};

// ─── Main ────────────────────────────────────────────

function pushToGitHub() {
  const json = buildScenarioJSON();
  const content = JSON.stringify(json, null, 2);
  commitToGitHub(content);
  SpreadsheetApp.getUi().alert('✅ Pushed to GitHub successfully!');
}

// ─── Build JSON from Sheet ───────────────────────────

function buildScenarioJSON() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const characters = sheetToObjects(ss.getSheetByName(CONFIG.CHARACTERS_TAB));
  const dialogs = sheetToObjects(ss.getSheetByName(CONFIG.DIALOGS_TAB));
  const facts = sheetToObjects(ss.getSheetByName(CONFIG.FACTS_TAB));

  // Cast numeric fields
  characters.forEach(c => {
    c.position_x = Number(c.position_x) || 0;
    c.position_y = Number(c.position_y) || 0;
    c.position_z = Number(c.position_z) || 0;
    c.rotation = Number(c.rotation) || 0;
  });

  return { characters, dialogs, facts };
}

function sheetToObjects(sheet) {
  if (!sheet) return [];
  const [headers, ...rows] = sheet.getDataRange().getValues();
  return rows
    .filter(row => row.some(cell => cell !== ''))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[String(h).trim()] = row[i] === '' ? '' : row[i];
      });
      return obj;
    });
}

// ─── GitHub API ──────────────────────────────────────

function commitToGitHub(content) {
  const base = `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}`;
  const headers = {
    Authorization: `token ${CONFIG.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
  };

  // Get current file SHA (if exists) — needed for updates
  let sha = null;
  try {
    const existing = UrlFetchApp.fetch(
      `${base}/contents/${CONFIG.FILE_PATH}?ref=${CONFIG.GITHUB_BRANCH}`,
      { headers, muteHttpExceptions: true }
    );
    if (existing.getResponseCode() === 200) {
      sha = JSON.parse(existing.getContentText()).sha;
    }
  } catch (e) { /* file doesn't exist yet, that's fine */ }

  // Create or update file
  const payload = {
    message: `📜 Update scenario from Google Sheet (${new Date().toISOString()})`,
    content: Utilities.base64Encode(content, Utilities.Charset.UTF_8),
    branch: CONFIG.GITHUB_BRANCH,
  };
  if (sha) payload.sha = sha;

  const response = UrlFetchApp.fetch(`${base}/contents/${CONFIG.FILE_PATH}`, {
    method: 'put',
    headers,
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() > 299) {
    throw new Error('GitHub API error: ' + response.getContentText());
  }
}

// ─── Custom Menu ─────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🏛️ Αρχαία Αγορά')
    .addItem('Push to GitHub', 'pushToGitHub')
    .addItem('Preview JSON', 'previewJSON')
    .addToUi();
}

function previewJSON() {
  const json = buildScenarioJSON();
  const html = HtmlService
    .createHtmlOutput(`<pre style="font-size:12px">${JSON.stringify(json, null, 2)}</pre>`)
    .setWidth(600)
    .setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(html, 'JSON Preview');
}
