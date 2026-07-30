// ============================================================
// GOOGLE APPS SCRIPT — Ghi dữ liệu chứng nhận Speaking
// Google Sheet ID: 1D_y9zYcWvIdgC78DzFy7T_QxItGAG90GtCNS-HYcn04
// Sheet name:      Speaking
// ============================================================
//
// HƯỚNG DẪN:
//   1. Mở Google Sheets → Tiện ích mở rộng → Apps Script
//   2. Xoá hết code cũ, dán toàn bộ code này vào
//   3. Nhấn 💾 Lưu
//   4. Nhấn ▶️ Chạy → chọn hàm "setupSheet" → Cấp quyền
//   5. Triển khai → Triển khai mới → Ứng dụng web
//        • Thực thi: Tôi (Me)
//        • Quyền truy cập: Bất kỳ ai (Anyone)
//   6. Copy URL Web App → dán vào file googleSheetsService.ts
// ============================================================

var SPREADSHEET_ID = "1D_y9zYcWvIdgC78DzFy7T_QxItGAG90GtCNS-HYcn04";
var SHEET_NAME     = "Speaking";

// ─── Hàm mở sheet (dùng ID cố định, không phụ thuộc file đang mở) ───
function getSheet() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);

  // Tạo sheet + header nếu chưa có
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, 6).setValues([
      ["STT", "Thời gian", "Họ và tên", "Lớp học", "Tên bài học", "Điểm số"]
    ]);
    var header = sheet.getRange(1, 1, 1, 6);
    header.setFontWeight("bold");
    header.setBackground("#0D9488");
    header.setFontColor("#FFFFFF");
    header.setHorizontalAlignment("center");
    header.setFontSize(11);
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 60);
    sheet.setColumnWidth(2, 180);
    sheet.setColumnWidth(3, 200);
    sheet.setColumnWidth(4, 120);
    sheet.setColumnWidth(5, 250);
    sheet.setColumnWidth(6, 100);
  }

  return sheet;
}

// ─── Nhận dữ liệu POST từ web app ──────────────────────
function doPost(e) {
  try {
    var data  = JSON.parse(e.postData.contents);
    var sheet = getSheet();

    var lastRow = sheet.getLastRow();   // 1 nếu chỉ có header
    var stt     = lastRow;              // header = row 1 → STT bắt đầu từ 1

    var timestamp = Utilities.formatDate(
      new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss"
    );

    var newRow = [
      stt,                          // A – STT
      timestamp,                    // B – Thời gian
      data.studentName || "",       // C – Họ và tên
      data.className   || "",       // D – Lớp học
      data.lessonName  || "",       // E – Tên bài học
      data.score       || 0         // F – Điểm số
    ];

    sheet.getRange(lastRow + 1, 1, 1, 6).setValues([newRow]);

    return ContentService
      .createTextOutput(JSON.stringify({
        status: "success",
        message: "Đã ghi dữ liệu thành công!",
        row: lastRow + 1,
        stt: stt
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "error",
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─── Test kết nối bằng GET ──────────────────────────────
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: "success",
      message: "Speaking Certificate API đang hoạt động!"
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Chạy lần đầu để tạo sheet + cấp quyền ─────────────
function setupSheet() {
  var sheet   = getSheet();
  var lastRow = sheet.getLastRow();
  Logger.log("Sheet '" + SHEET_NAME + "' đã sẵn sàng. Số dòng hiện tại: " + lastRow);
}

// ─── Test thử ghi 1 dòng mẫu ────────────────────────────
function testDoPost() {
  var fakeEvent = {
    postData: {
      contents: JSON.stringify({
        studentName: "Nguyễn Văn A",
        className:   "Starters",
        lessonName:  "My Family",
        score:       8.5
      })
    }
  };
  var result = doPost(fakeEvent);
  Logger.log(result.getContent());
}
