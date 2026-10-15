/**
 * TAMED submission API.
 * Authorized Writers: A ID, B Season, C Type, D Name, E Email, F Status,
 * G Submission Count, H Last Submission Date, I Maximum Submissions.
 * Submissions: A ID, B Date, C Full Name, D Pen Name, E Email, F Phone,
 * G Delivery Address, H Publish Preference, I Field, J Title, K Language,
 * L Manuscript Link, M Cover Image Link, N Status.
 *
 * Column I holds every editorial field the writer selected, comma separated,
 * for example "fiction, sci-fi" or "poetry, letters".
 * The manuscript and the cover image are both required. The column count and
 * column order above are fixed: do not add, remove or reorder columns.
 */
const CONFIG = {
  SPREADSHEET_ID: "1hoxXLKp6LiLCq84wt7W3S-g1WcdD7s3FApBFoPEXu2U",
  SUBMISSION_SHEET: "Submissions",
  AUTHORIZED_SHEET: "Authorized Writers",
  DRIVE_FOLDER_ID: "1C5sEelKw7K02M-fdpiI5_C_BUYbaToH1"
};

function doGet() { return json({ok:true, service:"TAMED submissions"}); }

function doPost(e) {
  let stage = "starting";
  try {
    stage = "reading request";
    if (!e || !e.postData || !e.postData.contents) throw new Error("Request body is empty.");
    const data = JSON.parse(e.postData.contents);
    stage = "checking writer";
    const writer = checkWriter(data.bcwoId, data.verificationEmail);
    // Read-only verification for the submit page; do not upload files or change counts.
    if (data.action === "verify") return json({success: writer.valid, verified: writer.valid, error: writer.valid ? "" : writer.error});
    if (!writer.valid) return json({success:false, error:writer.error});
    if (writer.maximum > 0 && writer.count >= writer.maximum) return json({success:false, error:"Maximum submission limit reached."});

    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      stage = "creating submission id";
      const id = createSubmissionId();
      stage = "uploading manuscript";
      const manuscriptUrl = uploadFile(data.manuscript, "Manuscripts", id, "Manuscript file");
      stage = "uploading cover image";
      const coverUrl = uploadFile(data.coverImage, "Cover Images", id, "Cover image");
      stage = "writing submission row";
      saveSubmission(data, id, manuscriptUrl, coverUrl);
      stage = "updating writer count";
      increaseCount(writer.row);
      return json({success:true, submissionId:id});
    } finally { lock.releaseLock(); }
  } catch (error) {
    return json({success:false, stage:stage, error:error && error.message ? error.message : String(error)});
  }
}

function checkWriter(id, email) {
  const cleanId = String(id || "").trim().toLowerCase();
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanId || !cleanEmail) return invalidWriter();
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.AUTHORIZED_SHEET);
  if (!sheet) throw new Error("Sheet not found: " + CONFIG.AUTHORIZED_SHEET);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (String(row[0] || "").trim().toLowerCase() !== cleanId) continue;
    if (String(row[4] || "").trim().toLowerCase() !== cleanEmail) continue;
    const status = String(row[5] || "").trim().toLowerCase();
    if (status && status !== "active") return invalidWriter();
    return {valid:true, row:i + 1, count:toNumber(row[6]), maximum:toNumber(row[8])};
  }
  return invalidWriter();
}

function invalidWriter() { return {valid:false, error:"That BCWO ID and verification email could not be found in our database."}; }

function uploadFile(file, childName, id, requiredLabel) {
  if (!file || !file.data || !file.name) {
    if (requiredLabel) throw new Error(requiredLabel + " is missing.");
    return "";
  }
  const root = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  const folders = root.getFoldersByName(childName);
  const folder = folders.hasNext() ? folders.next() : root.createFolder(childName);
  const raw = String(file.data);
  const comma = raw.indexOf(",");
  const encoded = comma >= 0 ? raw.slice(comma + 1) : raw;
  const blob = Utilities.newBlob(Utilities.base64Decode(encoded), file.type || "application/octet-stream", file.name);
  const created = folder.createFile(blob);
  created.setName(id + "_" + file.name);
  return created.getUrl();
}

// Column I takes the writer's full selection. Requests that carry a `categories`
// array are joined here; older requests that only carry `field` are written
// through unchanged, so the sheet contract stays the same either way.
function submissionFieldValue(data) {
  const categories = Array.isArray(data.categories) ? data.categories.filter(Boolean) : [];
  if (!categories.length) return data.field || "";
  const subsections = Array.isArray(data.subcategories) ? data.subcategories : [];
  return categories
    .map(function (slug) {
      const prefix = String(slug) + ":";
      const own = subsections
        .filter(function (key) { return String(key).indexOf(prefix) === 0; })
        .map(function (key) { return String(key).slice(prefix.length); });
      return own.length ? slug + "/" + own.join("+") : slug;
    })
    .join(", ");
}

function saveSubmission(data, id, manuscriptUrl, coverUrl) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SUBMISSION_SHEET);
  if (!sheet) throw new Error("Sheet not found: " + CONFIG.SUBMISSION_SHEET);
  sheet.appendRow([id, new Date(), data.writerName || "", data.penName || "", data.email || "", data.phone || "", data.deliveryAddress || "", data.publishPreference || "", submissionFieldValue(data), data.title || "", data.language || "", manuscriptUrl, coverUrl, "Pending"]);
}

function increaseCount(rowNumber) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.AUTHORIZED_SHEET);
  sheet.getRange(rowNumber, 7).setValue(toNumber(sheet.getRange(rowNumber, 7).getValue()) + 1);
  sheet.getRange(rowNumber, 8).setValue(new Date());
}

function createSubmissionId() {
  return "TMD-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss") + "-" + Math.floor(1000 + Math.random() * 9000);
}

function toNumber(value) { const n = Number(value); return isFinite(n) ? n : 0; }
function json(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }

function testSetup() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const root = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  Logger.log("Spreadsheet: " + spreadsheet.getName());
  Logger.log("Drive folder: " + root.getName());
  Logger.log("Authorized Writers tab: " + !!spreadsheet.getSheetByName(CONFIG.AUTHORIZED_SHEET));
  Logger.log("Submissions tab: " + !!spreadsheet.getSheetByName(CONFIG.SUBMISSION_SHEET));
}
