/**
 * Google Sheets Service
 * Gửi dữ liệu chứng nhận Speaking lên Google Sheets thông qua Google Apps Script Web App
 */

// ⚠️ QUAN TRỌNG: Thay URL này bằng URL Web App sau khi deploy Google Apps Script
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxL1vZAOnU61RMG6TBhXMFSqMQZNLdl3RhApimBIwp5JE2DV42415cUBFoj7F4knPa3/exec";

export interface CertificateData {
  studentName: string;
  className: string;   // Level/Lớp học (Starters, Movers, Flyers, etc.)
  lessonName: string;   // Tên bài học / Topic
  score: number;        // Điểm số
}

/**
 * Gửi dữ liệu chứng nhận lên Google Sheets
 * @returns Promise<boolean> - true nếu gửi thành công
 */
export async function submitCertificateToSheet(data: CertificateData): Promise<boolean> {
  // Kiểm tra URL đã được cấu hình chưa
  if (GOOGLE_SCRIPT_URL.includes("YOUR_DEPLOYMENT_ID")) {
    console.warn("[Google Sheets] URL chưa được cấu hình. Bỏ qua gửi dữ liệu.");
    return false;
  }

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors", // Apps Script Web App yêu cầu no-cors cho cross-origin
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    // Với mode "no-cors", response sẽ là opaque (không đọc được body)
    // Nên ta chỉ kiểm tra xem request có được gửi thành công không
    console.log("[Google Sheets] Đã gửi dữ liệu chứng nhận:", data);
    return true;
  } catch (error) {
    console.error("[Google Sheets] Lỗi khi gửi dữ liệu:", error);
    return false;
  }
}
