/**
 * TAMED submission API.
 * Authorized Writers: A ID, B Season, C Type, D Name, E Email, F Status,
 * G Submission Count, H Last Submission Date, I Maximum Submissions.
 * Submissions: A ID, B Date, C Full Name, D Pen Name, E Email, F Phone,
 * G Delivery Address, H Publish Preference, I Field, J Title, K Language,
 * L Manuscript Link, M Cover Image Link, N Status.
 */
const CONFIG = {
  SPREADSHEET_ID: "1hoxXLKp6LiLCq84wt7W3S-g1WcdD7s3FApBFoPEXu2U",
  SUBMISSION_SHEET: "Submissions",
  AUTHORIZED_SHEET: "Authorized Writers",
  DRIVE_FOLDER_ID: "1C5sEelKw7K02M-fdpiI5_C_BUYbaToH1"
};
const PART_BYTES = 3000000;
const MAX_ATTACHMENT_BYTES = 20000000;
const STAGING_PROPERTY = "TAMED_UPLOAD_FOLDER";
const SESSION_MS = 24 * 60 * 60 * 1000;

function doGet(e) {
  const params = (e && e.parameter) || {};
  if (params.action === "verify") return verifyResponse(params);
  return json({ok:true, service:"TAMED submissions"});
}

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (error) {
    return json({success:false, code:"INVALID_REQUEST"});
  }
  if (!data || typeof data !== "object") return json({success:false, code:"INVALID_REQUEST"});
  if (data.action === "verify") return verifyResponse(data);
  if (data.action && !["beginUpload", "uploadPart", "finishUpload"].includes(data.action)) {
    return json({success:false, code:"INVALID_REQUEST"});
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(12000)) return json({success:false, code:"BUSY"});
  let stage = "reading upload session";
  try {
    const staged = Boolean(data.action);
    let session;
    if (staged) {
      if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(data.uploadId || "")) {
        return json({success:false, code:"INVALID_REQUEST"});
      }
      const key = uploadKey(data);
      session = findSession(key);
      if (session) {
        stage = data.action === "uploadPart" ? "saving upload part" : "reading submission sheet";
        const receipt = data.action === "uploadPart" ? null : sessionReceipt(session);
        if (receipt) return json({success:true, submissionId:receipt});
        if (Date.now() - session.metadata.startedAt >= SESSION_MS) return json({success:false, code:"SESSION_EXPIRED"});
        if (data.action === "beginUpload") {
          return json(session.metadata.inputHash === inputHash(data) ? {success:true} : {success:false, code:"SESSION_CHANGED"});
        }
        if (data.action === "uploadPart") return json(storePart(session, data));
        data = session.metadata.input;
      } else if (data.action !== "beginUpload") {
        return json({success:false, code:"SESSION_EXPIRED"});
      }
    }

    stage = "checking writer";
    const writer = checkWriter(data.bcwoId, data.verificationEmail);
    if (!writer.valid) return json({success:false, code:writer.code, error:writer.error});
    if (writer.maximum > 0 && writer.count >= writer.maximum) {
      return json({success:false, code:"SUBMISSION_LIMIT", error:"Maximum submission limit reached."});
    }
    if (data.action === "beginUpload" && !session) {
      if (!validAttachment(data.manuscript) || !validAttachment(data.coverImage) ||
          !/\.(doc|docx|pdf|txt)$/i.test(data.manuscript.name) || !/^image\//.test(data.coverImage.type) ||
          data.manuscript.size + data.coverImage.size > MAX_ATTACHMENT_BYTES) {
        return json({success:false, code:"PART_INVALID"});
      }
      stage = "creating upload session";
      createSession(data);
      return json({success:true});
    }

    stage = "reading submission sheet";
    const sheet = writer.spreadsheet.getSheetByName(CONFIG.SUBMISSION_SHEET);
    if (!sheet) throw new Error("Submissions sheet is unavailable");
    let id = session ? session.metadata.id : createSubmissionId();
    while (findSubmission(sheet, id)) id = createSubmissionId();
    if (session && id !== session.metadata.id) {
      stage = "updating upload session";
      session.metadata.id = id;
      session.folder.setDescription(JSON.stringify(session.metadata));
    }
    return json(commitSubmission(sheet, writer, data, id, session));
  } catch (error) {
    console.error(stage, error);
    return json({success:false, stage:stage, code:stage === "checking writer" ? "REGISTER_ERROR" : stage === "reading submission sheet" ? "SHEET_ERROR" : "DRIVE_ERROR"});
  } finally {
    lock.releaseLock();
  }
}

function verifyResponse(data) {
  try {
    const writer = checkWriter(data.bcwoId, data.verificationEmail);
    if (!writer.valid) return json({success:true, verified:false, code:writer.code, error:writer.error});
    const limitReached = writer.maximum > 0 && writer.count >= writer.maximum;
    return json({success:true, verified:true, code:limitReached ? "SUBMISSION_LIMIT" : undefined});
  } catch (error) {
    console.error("checking writer", error);
    return json({success:false, code:"REGISTER_ERROR"});
  }
}

function normalize(value) {
  return String(value == null ? "" : value).trim().toLowerCase();
}

function checkWriter(id, email) {
  const cleanId = normalize(id);
  const cleanEmail = normalize(email);
  const notFound = {valid:false, code:"WRITER_NOT_FOUND", error:"That BCWO ID and verification email could not be found in our database."};
  if (!cleanId || !cleanEmail) return notFound;
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(CONFIG.AUTHORIZED_SHEET);
  if (!sheet) throw new Error("Authorized Writers sheet is unavailable");
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return notFound;
  const rows = sheet.getRange(2, 1, lastRow - 1, 6).getDisplayValues();
  let inactive = false;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (normalize(row[0]) !== cleanId || normalize(row[4]) !== cleanEmail) continue;
    const status = normalize(row[5]);
    if (status && status !== "active") {
      inactive = true;
      continue;
    }
    const countRange = sheet.getRange(i + 2, 7, 1, 2);
    const counts = sheet.getRange(i + 2, 7, 1, 3).getValues()[0];
    return {valid:true, spreadsheet:spreadsheet, countRange:countRange, count:toNumber(counts[0]), counts:counts, maximum:toNumber(counts[2])};
  }
  return inactive ? {valid:false, code:"WRITER_INACTIVE", error:"This BCWO registration is inactive."} : notFound;
}

function digest(text) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text)).replace(/=+$/, "");
}

function uploadKey(data) {
  return digest(JSON.stringify([data.uploadId.toLowerCase(), normalize(data.bcwoId), normalize(data.verificationEmail)]));
}

function inputHash(data) {
  return digest(JSON.stringify(data));
}

function stagingRoot(create) {
  const properties = PropertiesService.getScriptProperties();
  const id = properties.getProperty(STAGING_PROPERTY);
  if (id) return DriveApp.getFolderById(id);
  if (!create) return null;
  const folder = DriveApp.createFolder("TAMED temporary uploads");
  properties.setProperty(STAGING_PROPERTY, folder.getId());
  return folder;
}

function findSession(key) {
  const root = stagingRoot(false);
  if (!root) return null;
  const folders = root.getFoldersByName(key);
  if (!folders.hasNext()) return null;
  const folder = folders.next();
  return {key:key, folder:folder, metadata:JSON.parse(folder.getDescription())};
}

function createSession(data) {
  const folder = stagingRoot(true).createFolder(uploadKey(data));
  try {
    const metadata = {startedAt:Date.now(), id:createSubmissionId(), inputHash:inputHash(data), input:data};
    folder.setDescription(JSON.stringify(metadata));
  } catch (error) {
    folder.setTrashed(true);
    throw error;
  }
}

function validAttachment(file) {
  return file && typeof file.name === "string" && file.name.length > 0 && file.name.length <= 255 &&
    typeof file.type === "string" && file.type.length <= 100 && Number.isSafeInteger(file.size) &&
    file.size > 0 && file.size <= MAX_ATTACHMENT_BYTES;
}

function storePart(session, data) {
  if (!["manuscript", "coverImage"].includes(data.kind) || !Number.isInteger(data.index) || data.index < 0) {
    return {success:false, code:"PART_INVALID"};
  }
  const file = session.metadata.input[data.kind];
  const size = Math.min(PART_BYTES, file.size - data.index * PART_BYTES);
  if (size <= 0 || typeof data.data !== "string" || data.data.length !== Math.ceil(size / 3) * 4) {
    return {success:false, code:"PART_INVALID"};
  }
  const padding = (3 - size % 3) % 3;
  const end = data.data.length - padding;
  if (data.data.slice(end) !== "=".repeat(padding) || /[^A-Za-z0-9+/]/.test(data.data.slice(0, end))) {
    return {success:false, code:"PART_INVALID"};
  }
  const name = data.kind + "-" + data.index;
  if (!session.folder.getFilesByName(name).hasNext()) session.folder.createFile(name, data.data);
  return {success:true};
}

function readParts(session, kind) {
  const file = session.metadata.input[kind];
  const count = Math.ceil(file.size / PART_BYTES);
  const parts = [];
  for (let index = 0; index < count; index++) {
    const files = session.folder.getFilesByName(kind + "-" + index);
    if (!files.hasNext()) return null;
    parts.push(files.next().getBlob().getDataAsString());
  }
  const blob = decodeAttachment(file, parts.join(""));
  return blob.getBytes().length === file.size ? blob : null;
}

function decodeAttachment(file, encoded) {
  return Utilities.newBlob(Utilities.base64Decode(encoded), file.type || "application/octet-stream", file.name);
}

function legacyAttachment(file) {
  if (!file || !file.name || !file.data) return null;
  const raw = String(file.data);
  return decodeAttachment(file, raw.slice(raw.indexOf(",") + 1));
}

function childFolder(root, name) {
  const folders = root.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : root.createFolder(name);
}

function findSubmission(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  return sheet.getRange(2, 1, lastRow - 1, 1).createTextFinder(id).matchEntireCell(true).findNext();
}

function sessionReceipt(session) {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(CONFIG.SUBMISSION_SHEET);
  if (!sheet) return null;
  const cell = findSubmission(sheet, session.metadata.id);
  return cell && cell.getNote() === session.key ? session.metadata.id : null;
}

function commitSubmission(sheet, writer, data, id, session) {
  const created = [];
  let row;
  let wroteCount = false;
  let stage = "saving manuscript";
  try {
    const manuscript = session ? readParts(session, "manuscript") : legacyAttachment(data.manuscript);
    if (!manuscript) return {success:false, code:"MANUSCRIPT_INCOMPLETE"};
    stage = "saving cover";
    const cover = session ? readParts(session, "coverImage") : legacyAttachment(data.coverImage);
    if (!cover) return {success:false, code:"COVER_INCOMPLETE"};

    stage = "saving manuscript";
    const root = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    created.push(childFolder(root, "Manuscripts").createFile(manuscript.setName(id + "_" + manuscript.getName())));
    stage = "saving cover";
    created.push(childFolder(root, "Cover Images").createFile(cover.setName(id + "_" + cover.getName())));

    stage = "writing submission";
    row = sheet.getRange(sheet.getLastRow() + 1, 1, 1, 14);
    row.setValues([[id, new Date(), cellText(data.writerName), cellText(data.penName), cellText(data.email),
      cellText(data.phone), cellText(data.deliveryAddress), cellText(data.publishPreference), cellText(submissionFieldValue(data)),
      cellText(data.title), cellText(data.language), created[0].getUrl(), created[1].getUrl(), "Pending"]]);
    stage = "updating writer count";
    wroteCount = true;
    writer.countRange.setValues([[writer.count + 1, new Date()]]);
    SpreadsheetApp.flush();
    if (session) {
      row.getCell(1, 1).setNote(session.key);
      SpreadsheetApp.flush();
    }
    return {success:true, submissionId:id};
  } catch (error) {
    console.error(stage, error);
    try {
      if (row && row.getCell(1, 1).getValue() === id) row.clearContent().clearNote();
      if (wroteCount) writer.countRange.setValues([[writer.counts[0], writer.counts[1]]]);
      SpreadsheetApp.flush();
      created.forEach((file) => file.setTrashed(true));
    } catch (rollbackError) {
      console.error("reverting submission", rollbackError);
      return {success:false, code:"COMMIT_UNCERTAIN"};
    }
    return {success:false, stage:stage, code:row ? "SHEET_ERROR" : "DRIVE_ERROR"};
  }
}

function cellText(value) {
  const text = String(value || "");
  return text.startsWith("=") ? "'" + text : text;
}

// Keep the existing 14-column sheet and support older clients that send subsections.
function submissionFieldValue(data) {
  const categories = Array.isArray(data.categories) ? data.categories.filter(Boolean) : [];
  if (!categories.length) return data.field || "";
  const subsections = Array.isArray(data.subcategories) ? data.subcategories : [];
  return categories.map((slug) => {
    const prefix = slug + ":";
    const own = subsections.map(String).filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length));
    return own.length ? slug + "/" + own.join("+") : slug;
  }).join(", ");
}

function createSubmissionId() {
  return "TMD-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss") + "-" + Math.floor(1000 + Math.random() * 9000);
}

function toNumber(value) { const n = Number(value); return isFinite(n) ? n : 0; }
function json(value) { return ContentService.createTextOutput(JSON.stringify({protocol:1, ...value})).setMimeType(ContentService.MimeType.JSON); }

function cleanupExpiredUploads() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const root = stagingRoot(false);
    if (!root) return;
    const sessions = root.getFolders();
    while (sessions.hasNext()) {
      const folder = sessions.next();
      if (Date.now() - folder.getDateCreated().getTime() >= SESSION_MS) folder.setTrashed(true);
    }
  } finally {
    lock.releaseLock();
  }
}

function installUploadCleanup() {
  if (!ScriptApp.getProjectTriggers().some((trigger) => trigger.getHandlerFunction() === "cleanupExpiredUploads")) {
    ScriptApp.newTrigger("cleanupExpiredUploads").timeBased().everyHours(1).create();
  }
}

function testSetup() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const root = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  Logger.log("Spreadsheet: " + spreadsheet.getName());
  Logger.log("Drive folder: " + root.getName());
  Logger.log("Authorized Writers tab: " + !!spreadsheet.getSheetByName(CONFIG.AUTHORIZED_SHEET));
  Logger.log("Submissions tab: " + !!spreadsheet.getSheetByName(CONFIG.SUBMISSION_SHEET));
}
