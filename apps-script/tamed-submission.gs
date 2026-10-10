/**
 * TAMED Submission System
 * Deploy as Web app: Execute as Me, Who has access: Anyone.
 * Bind this script to the Google Sheet that owns the "Submissions" tab.
 */
const CONFIG = {
  sheetName: "Submissions",
  folderName: "TAMED Submissions",
  status: "received",
  headers: ["Submission ID", "Submitted Date", "Full Name", "Pen Name", "Email", "Phone Number", "Country", "City", "Delivery Address", "Publish Preference", "The Ten Field", "Title", "Language", "Manuscript Link", "Cover Image Link", "Status", "Editor Notes", "Internal Notes"]
};

function doGet() { return jsonResponse({ ok: true, service: "TAMED submissions" }); }

function doPost(e) {
  let stage = "starting";
  try {
    stage = "reading request";
    if (!e || !e.postData || !e.postData.contents) throw new Error("Request body is empty.");
    const data = JSON.parse(e.postData.contents);
    stage = "validating data";
    validateSubmission(data);
    stage = "generating submission id";
    const submissionId = data.submissionId || generateSubmissionId();
    stage = "getting upload folder";
    const folder = getUploadFolder();
    stage = "uploading manuscript";
    const manuscriptUrl = uploadDataUrl(data.manuscript, folder);
    stage = "uploading cover image";
    const coverImageUrl = data.coverImage ? uploadDataUrl(data.coverImage, folder) : "";
    stage = "writing spreadsheet row";
    saveSubmission(data, submissionId, manuscriptUrl, coverImageUrl);
    return jsonResponse({ success: true, submissionId: submissionId, manuscriptUrl: manuscriptUrl, coverImageUrl: coverImageUrl });
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    const eligibilityFailure = /bcwo|verification|registration|season|inactive|authorized writer|account/i.test(message);
    return jsonResponse({
      success: false,
      stage: stage,
      error: eligibilityFailure
        ? "That BCWO ID and verification email could not be found in our database."
        : message
    });
  }
}

function validateSubmission(data) {
  ["title", "email", "field", "manuscript"].forEach(function (name) {
    if (!data[name]) throw new Error(name + " is required.");
  });
  if (!data.manuscript.data || !data.manuscript.name) throw new Error("Manuscript data is invalid.");
  if (data.coverImage && (!data.coverImage.data || !data.coverImage.name)) throw new Error("Cover image data is invalid.");
}

function generateSubmissionId() {
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMddHHmmss");
  return "TMD-" + stamp + "-" + Math.floor(1000 + Math.random() * 9000);
}

function getUploadFolder() {
  const folders = DriveApp.getFoldersByName(CONFIG.folderName);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(CONFIG.folderName);
}

function uploadDataUrl(file, folder) {
  const comma = file.data.indexOf(",");
  if (comma < 0) throw new Error("Invalid data URL for " + file.name + ".");
  const encoded = file.data.substring(comma + 1);
  const bytes = Utilities.base64Decode(encoded);
  const blob = Utilities.newBlob(bytes, file.type || "application/octet-stream", file.name);
  const created = folder.createFile(blob);
  return created.getUrl();
}

function saveSubmission(data, submissionId, manuscriptUrl, coverImageUrl) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetName);
  if (!sheet) throw new Error("Sheet not found: " + CONFIG.sheetName);
  ensureHeaders(sheet);
  sheet.appendRow([
    submissionId,
    new Date(),
    data.writerName || "",
    data.penName || "",
    data.email || "",
    data.phone || "",
    data.country || "",
    data.city || "",
    data.deliveryAddress || "",
    data.publishPreference || "",
    data.field || "",
    data.title || "",
    data.language || "",
    manuscriptUrl,
    coverImageUrl,
    data.status || CONFIG.status,
    "",
    ""
  ]);
}

function ensureHeaders(sheet) {
  const current = sheet.getRange(1, 1, 1, CONFIG.headers.length).getValues()[0];
  if (current[0] !== CONFIG.headers[0]) sheet.getRange(1, 1, 1, CONFIG.headers.length).setValues([CONFIG.headers]);
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
