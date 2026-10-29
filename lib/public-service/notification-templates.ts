export type NotificationTemplateKey = 'post_rating' | 'rating_invitation' | 'resend_pdf';

export const DEFAULT_NOTIFICATION_TEMPLATES: Record<NotificationTemplateKey, string> = {
  post_rating: `Kính chào Anh/Chị {{citizen_name}},\n\nTrung tâm Phục vụ Hành chính công trân trọng cảm ơn Anh/Chị đã xác nhận nhận kết quả và gửi đánh giá cho hồ sơ {{case_code}}.\n\nTệp đính kèm trong tin nhắn này là Giấy hẹn trả kết quả của hồ sơ. Anh/Chị vui lòng mở và lưu lại để sử dụng khi cần.\n\nTrân trọng,\n{{department_name}}`,
  rating_invitation: `Kính chào Anh/Chị {{citizen_name}},\n\nGiấy hẹn trả kết quả của hồ sơ {{case_code}} đã được phát hành.\n\nAnh/Chị vui lòng mở tệp đính kèm để xem giấy hẹn và truy cập Mini App để xác nhận nhận kết quả, đồng thời gửi đánh giá chất lượng phục vụ.\n\nTrân trọng,\n{{department_name}}`,
  resend_pdf: `Kính chào Anh/Chị {{citizen_name}},\n\nTrung tâm Phục vụ Hành chính công gửi bổ sung Giấy hẹn trả kết quả của hồ sơ {{case_code}}.\n\nTệp PDF đính kèm là Giấy hẹn của hồ sơ. Anh/Chị vui lòng kiểm tra và lưu lại.\n\nTrân trọng,\n{{department_name}}`,
};

export const TEMPLATE_LABELS: Record<NotificationTemplateKey, { title: string; description: string }> = {
  post_rating: { title: 'Sau khi công dân xác nhận và đánh giá', description: 'Gửi lời cảm ơn và giải thích tệp PDF đính kèm là Giấy hẹn trả kết quả.' },
  rating_invitation: { title: 'Mời xác nhận và đánh giá', description: 'Gửi khi cán bộ phát hành hồ sơ lần đầu qua OA.' },
  resend_pdf: { title: 'Gửi bổ sung giấy hẹn', description: 'Gửi khi cán bộ chủ động gửi bổ sung Giấy hẹn qua OA.' },
};

export const TEMPLATE_VARIABLES = ['{{citizen_name}}', '{{case_code}}', '{{procedure_name}}', '{{appointment_date}}', '{{department_name}}', '{{officer_name}}'];

export function renderNotificationTemplate(template: string, values: Record<string, string | null | undefined>) {
  const fallback: Record<string, string> = {
    citizen_name: 'Anh/Chị',
    case_code: '',
    procedure_name: '',
    appointment_date: 'chưa cập nhật',
    department_name: 'Trung tâm Phục vụ Hành chính công',
    officer_name: 'chưa cập nhật',
  };
  return template.replace(/{{\s*([a-z_]+)\s*}}/g, (_match, key: string) => String(values[key] || fallback[key] || ''));
}
