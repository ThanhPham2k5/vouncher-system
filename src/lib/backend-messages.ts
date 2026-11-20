// Việt hóa thông báo lỗi do BE trả về.
// Chỉ dùng ở lớp BFF (route proxy) cho response lỗi. Thông báo không có trong bảng sẽ giữ nguyên.

const NOUNS: Record<string, string> = {
  campaign: "chiến dịch",
  batch: "lô voucher",
  "voucher batch": "lô voucher",
  voucherbatch: "lô voucher",
  "batch rule": "quy tắc lô",
  batchrule: "quy tắc lô",
  reward: "phần thưởng",
  condition: "điều kiện",
  voucher: "voucher",
  "customer voucher": "voucher trong ví",
  config: "cấu hình giới hạn tần suất",
  "black list": "danh sách đen",
  blacklist: "danh sách đen",
  "fraud log": "nhật ký gian lận",
  "redemption log": "nhật ký áp mã",
  "distribution log": "nhật ký phân phối",
  admin: "quản trị viên",
};

const EXACT: Record<string, string> = {
  // Đăng nhập, token, quyền
  "Username or Password is invalid": "Tên đăng nhập hoặc mật khẩu không đúng",
  "The account has been disabled": "Tài khoản đã bị vô hiệu hóa",
  "Authentication required": "Yêu cầu đăng nhập",
  "Access denied": "Không có quyền truy cập",
  "Refresh token has expired or is invalid":
    "Refresh token đã hết hạn hoặc không hợp lệ",
  "Invalid token type. Expected an access token.":
    "Loại token không hợp lệ, cần access token",
  "Invalid token type. Expected a refresh token.":
    "Loại token không hợp lệ, cần refresh token",
  "No active session found for the provided refresh token":
    "Không tìm thấy phiên đăng nhập cho refresh token này",
  "No active session with the requested refresh token found in the system":
    "Không tìm thấy phiên đăng nhập cho refresh token này",
  "Refresh token must not be empty": "Refresh token không được để trống",
  "Username must not be empty": "Tên đăng nhập không được để trống",
  "Password must not be empty": "Mật khẩu không được để trống",

  // Chung
  "Invalid request": "Yêu cầu không hợp lệ",
  "An unexpected server error occurred": "Máy chủ gặp lỗi không mong muốn",
  "Mail server is not configured": "Chưa cấu hình máy chủ email",
  "Could not generate enough unique codes":
    "Không sinh đủ mã duy nhất, hãy giảm số lượng hoặc thử lại",
  "No Available Voucher": "Không còn voucher khả dụng",
  "Customer has already redeemed this voucher":
    "Khách hàng đã sử dụng voucher này",
  "Only BULK voucher batches can be added to a customer wallet":
    "Chỉ lô BULK mới được thêm vào ví khách hàng",
  "Cannot update voucher batch because voucher generation is in progress.":
    "Không thể sửa lô voucher khi đang sinh mã",
  "endTime must after starTime":
    "Thời gian kết thúc phải sau thời gian bắt đầu",
  "endTime must be after startTime":
    "Thời gian kết thúc phải sau thời gian bắt đầu",
  "startTime and endTime must not be null":
    "Thời gian bắt đầu và kết thúc không được để trống",
  "rewardId must not null": "rewardId không được để trống",
  "conditionId must not null": "conditionId không được để trống",
  "maxUsageCount must be greater than 0 for GENERIC batch":
    "Với lô GENERIC, maxUsageCount phải lớn hơn 0",
  "distributionChannels total quota must be greater than 0 for BULK batch":
    "Với lô BULK, tổng quota các kênh phải lớn hơn 0",
  "distributionChannels total quota must be greater than 0":
    "Tổng quota các kênh phải lớn hơn 0",
  "channel must be EMAIL or WEBHOOK": "Kênh phải là EMAIL hoặc WEBHOOK",
  "Condition type and object config are required":
    "Loại điều kiện và config là bắt buộc",
  "Unsupported amountBasis": "amountBasis không được hỗ trợ",
  "Unsupported calculationMode": "calculationMode không được hỗ trợ",
  "Tier minimum amounts must be strictly increasing":
    "Ngưỡng giá trị của các bậc phải tăng dần nghiêm ngặt",
  "A time window startTime and endTime must differ":
    "Khung thời gian: startTime và endTime phải khác nhau",
  "Invalid discount amount": "Số tiền giảm không hợp lệ",
  "Reward calculator returned discount greater than cart subtotal":
    "Số tiền giảm vượt tổng giỏ hàng",

  // Áp mã
  "Campaign is inactive": "Chiến dịch không hoạt động",
  "Campaign is inactive or expired":
    "Chiến dịch không hoạt động hoặc đã hết hạn",
  "Voucher batch is not available": "Lô voucher hiện không khả dụng",
  "Voucher rule is not published": "Quy tắc voucher chưa được xuất bản",
  "Cart does not satisfy voucher conditions":
    "Giỏ hàng không đáp ứng điều kiện của voucher",
  "Voucher is no longer available to this customer":
    "Voucher không còn khả dụng với khách hàng này",
  "Batch quota or campaign availability has changed":
    "Quota của lô hoặc trạng thái chiến dịch vừa thay đổi, vui lòng thử lại",
  "Voucher is currently being processed":
    "Voucher đang được xử lý, vui lòng thử lại",
  "Redemption service is temporarily unavailable":
    "Dịch vụ áp mã tạm thời không khả dụng",
  "Interrupted while waiting for redemption lock":
    "Yêu cầu bị gián đoạn khi chờ khóa áp mã, vui lòng thử lại",
  "This customer or device is blocked from redeeming vouchers":
    "Khách hàng hoặc thiết bị này đang bị chặn áp mã",

  // Giới hạn tần suất và danh sách đen (cache, Redis)
  "Rate limit exceeded. Please try again later.":
    "Vượt quá số lần yêu cầu, vui lòng thử lại sau",
  "Too many requests. This subject has been temporarily blocked.":
    "Quá nhiều yêu cầu, tạm thời bị chặn",
  "Could not execute rate limit counters":
    "Không thể thực hiện bộ đếm giới hạn tần suất",
  "Could not execute Redis rate limiter":
    "Không thể thực hiện giới hạn tần suất, vui lòng thử lại",
  "Rate limit configuration cache is unavailable":
    "Cấu hình giới hạn tần suất tạm thời không khả dụng",
  "Blacklist index is unavailable": "Danh sách đen tạm thời không khả dụng",
  "Could not check blacklist index":
    "Không thể kiểm tra danh sách đen, vui lòng thử lại",
  "Could not update blacklist index":
    "Không thể cập nhật danh sách đen, vui lòng thử lại",
  "Could not remove blacklist index entry":
    "Không thể gỡ mục khỏi danh sách đen, vui lòng thử lại",
  "Could not initialize blacklist index":
    "Không thể khởi tạo danh sách đen, vui lòng thử lại",
  "An active blacklist already exists for this target":
    "Đã tồn tại danh sách đen đang hoạt động cho đối tượng này",
  "Blacklist expiration must be in the future":
    "Thời hạn hết hiệu lực của danh sách đen phải ở tương lai",
  "Cannot activate a blacklist that has already expired":
    "Không thể kích hoạt danh sách đen đã hết hạn",

  // Chiến dịch, quy tắc
  "Cannot activate a campaign whose endTime has already passed":
    "Không thể kích hoạt chiến dịch đã quá thời gian kết thúc",
  "The reward has been Published":
    "Phần thưởng đã được xuất bản nên không thể sửa",
  "The condition has been Published":
    "Điều kiện đã được xuất bản nên không thể sửa",
  "A batch rule with this reward and condition already exists.":
    "Quy tắc lô với phần thưởng và điều kiện này đã tồn tại",
  "Cannot update a rule that is currently in use by a generated voucher batch.":
    "Không thể sửa quy tắc đang được dùng bởi lô voucher đã sinh mã",

  // Validation mặc định của Jakarta/Hibernate (không kèm tên trường)
  "must not be null": "Không được để trống",
  "must not be blank": "Không được để trống",
  "must not be empty": "Không được để trống",
  "must be greater than 0": "Phải lớn hơn 0",
  "must be greater than or equal to 0": "Phải lớn hơn hoặc bằng 0",
  "must be greater than or equal to 0.00": "Phải lớn hơn hoặc bằng 0",
  "must be a well-formed email address": "Email không đúng định dạng",
};

type Rule = [RegExp, (m: RegExpMatchArray) => string];

const noun = (raw: string): string => NOUNS[raw.toLowerCase()] ?? raw;

const RULES: Rule[] = [
  // Không tìm thấy theo id hoặc mã
  [
    /^No (.+?) with (id|code) (.+?) found in the system$/i,
    (m) =>
      `Không tìm thấy ${noun(m[1])} với ${m[2].toLowerCase() === "id" ? "id" : "mã"} ${m[3]}`,
  ],
  [
    /^No voucher batch with id (.+) found in campaign (.+)$/,
    (m) => `Không tìm thấy lô voucher với id ${m[1]} trong chiến dịch ${m[2]}`,
  ],
  [
    /^(\w+) not found(?: with ID)?: (.+)$/,
    (m) => `Không tìm thấy ${noun(m[1])}: ${m[2]}`,
  ],
  [
    /^No (condition|reward) found for VoucherBatch's Rule$/,
    (m) => `Không tìm thấy ${noun(m[1])} của quy tắc lô`,
  ],
  [
    /^Account not found for username: (.+)$/,
    (m) => `Không tìm thấy tài khoản: ${m[1]}`,
  ],

  // Trạng thái, lượt dùng, kênh phân phối
  [
    /^Cannot change campaign status from (\w+) to (\w+)$/,
    (m) => `Không thể đổi trạng thái chiến dịch từ ${m[1]} sang ${m[2]}`,
  ],
  [
    /^Batch max usage exceeded; batch (\S+), used (\S+), max (\S+)$/,
    (m) =>
      `Lô ${m[1]} đã vượt số lượt dùng tối đa (đã dùng ${m[2]}, tối đa ${m[3]})`,
  ],
  [
    /^Channel Quota Exceeded; (\S+), (\S+), (\S+)$/,
    (m) => `Kênh ${m[2]} của lô ${m[1]} đã vượt quota ${m[3]}`,
  ],
  [
    /^Channel Not Enabled For Batch: (\S+), (\S+)$/,
    (m) => `Lô ${m[1]} chưa bật kênh ${m[2]}`,
  ],
  [
    /^Unsupported Batch Type: (.+)$/,
    (m) => `Loại lô không được hỗ trợ: ${m[1]}`,
  ],
  [
    /^Unsupported distribution channel: (.+)$/,
    (m) => `Kênh phân phối không được hỗ trợ: ${m[1]}`,
  ],
  [
    /^Duplicate address allocation exception\s*(.*)$/,
    (m) => `Địa chỉ nhận bị trùng lặp: ${m[1]}`,
  ],
  [
    /^Customer (\S+) already holds voucher (\S+)$/,
    (m) => `Khách hàng ${m[1]} đã có voucher ${m[2]}`,
  ],
  [
    /^Voucher generation is already in progress for batch (\S+)$/,
    (m) => `Lô ${m[1]} đang sinh voucher, vui lòng đợi`,
  ],
  [
    /^Cannot generate vouchers because the batch is already in (\S+)$/,
    (m) => `Không thể sinh voucher vì lô đang ở trạng thái ${m[1]}`,
  ],
  [
    /^Cannot update voucher batch because it is already in (\S+) state\.$/,
    (m) => `Không thể sửa lô voucher vì đang ở trạng thái ${m[1]}`,
  ],
  [
    /^distributionChannels total quota must be in \[1, (\d+)\], got (\d+)$/,
    (m) => `Tổng quota các kênh phải nằm trong [1, ${m[1]}], hiện là ${m[2]}`,
  ],

  // Điều kiện, phần thưởng, mã voucher
  [
    /^Unsupported condition type: (.+)$/,
    (m) => `Loại điều kiện không được hỗ trợ: ${m[1]}`,
  ],
  [
    /^Unsupported reward type: (.+)$/,
    (m) => `Loại phần thưởng không được hỗ trợ: ${m[1]}`,
  ],
  [
    /^Maximum condition nesting depth is ?(\d+)$/,
    (m) => `Độ lồng nhau tối đa của điều kiện là ${m[1]}`,
  ],
  [
    /^codeConfig\.length is too short to generate (\d+) unique codes$/,
    (m) => `codeConfig.length quá ngắn để sinh ${m[1]} mã duy nhất`,
  ],
  [
    /^codeConfig\.prefix \+ length must be at most (\d+) characters$/,
    (m) => `codeConfig.prefix cộng length tối đa ${m[1]} ký tự`,
  ],
  [
    /^codeConfig\.length must be in \[(\d+), (\d+)\]$/,
    (m) => `codeConfig.length phải nằm trong khoảng [${m[1]}, ${m[2]}]`,
  ],
  [
    /^codeConfig\.charset must be one of (.+)$/,
    (m) => `codeConfig.charset phải là một trong: ${m[1]}`,
  ],
  [
    /^codeConfig\.prefix may only contain letters, digits, '-' and '_'$/,
    () => "codeConfig.prefix chỉ được chứa chữ cái, chữ số, '-' và '_'",
  ],

  // Gửi phân phối
  [
    /^targetAddress is not a valid email address: (.+)$/,
    (m) => `Địa chỉ email không hợp lệ: ${m[1]}`,
  ],
  [
    /^targetAddress is not a valid webhook URL: (.+)$/,
    (m) => `URL webhook không hợp lệ: ${m[1]}`,
  ],
  [
    /^targetAddress must be an absolute http\(s\) URL: (.+)$/,
    (m) => `URL phải là đường dẫn http(s) tuyệt đối: ${m[1]}`,
  ],
  [/^Failed to send email to (.+)$/, (m) => `Gửi email tới ${m[1]} thất bại`],
  [/^Failed to call webhook (.+)$/, (m) => `Gọi webhook ${m[1]} thất bại`],

  // Validation theo trường và cấu hình JSON (tên trường kỹ thuật như config.xxx được giữ nguyên)
  [
    /^size must be between (\d+) and (\d+)$/,
    (m) => `Độ dài phải từ ${m[1]} đến ${m[2]} ký tự`,
  ],
  [
    /^(.+) must be at most (\d+) characters$/,
    (m) => `${m[1]} tối đa ${m[2]} ký tự`,
  ],
  [/^(.+) must be a JSON object$/, (m) => `${m[1]} phải là đối tượng JSON`],
  [
    /^(.+) must be a non-empty array$/,
    (m) => `${m[1]} phải là mảng không rỗng`,
  ],
  [
    /^(.+) must be a non-empty string$/,
    (m) => `${m[1]} phải là chuỗi không rỗng`,
  ],
  [
    /^(.+) must contain non-empty strings$/,
    (m) => `${m[1]} phải chứa các chuỗi không rỗng`,
  ],
  [
    /^(.+) must not contain duplicates$/,
    (m) => `${m[1]} không được chứa giá trị trùng lặp`,
  ],
  [/^(.+) must not be duplicated$/, (m) => `${m[1]} không được trùng lặp`],
  [
    /^(.+) must be a positive integer$/,
    (m) => `${m[1]} phải là số nguyên dương`,
  ],
  [
    /^(.+) must be a non-negative integer$/,
    (m) => `${m[1]} phải là số nguyên không âm`,
  ],
  [/^(.+) must be a number$/, (m) => `${m[1]} phải là số`],
  [
    /^(.+) must be (AND or OR|IN or NOT_IN)$/,
    (m) => `${m[1]} phải là ${m[2].replace(" or ", " hoặc ")}`,
  ],
  [
    /^(.+) must be in \((.+)\]$/,
    (m) => `${m[1]} phải nằm trong khoảng (${m[2]}]`,
  ],
  [/^(.+) must be (greater than 0|positive)$/, (m) => `${m[1]} phải lớn hơn 0`],
  [
    /^(.+) must be (>= 0|greater than or equal to 0(?:\.00)?)$/,
    (m) => `${m[1]} phải lớn hơn hoặc bằng 0`,
  ],
  [
    /^(.+) startTime and endTime must not be equal$/,
    (m) => `${m[1]}: startTime và endTime không được bằng nhau`,
  ],
  [
    /^(.+) contains an invalid time$/,
    (m) => `${m[1]} chứa thời gian không hợp lệ`,
  ],
  [/^(.+) is invalid$/, (m) => `${m[1]} không hợp lệ`],
  [/^(.+) is required$/, (m) => `${m[1]} là bắt buộc`],
  [/^(.+) is not supported$/, (m) => `${m[1]} không được hỗ trợ`],
  [
    /^(.+) must not be (null|blank|empty)$/,
    (m) => `${m[1]} không được để trống`,
  ],
];

// Trả về thông báo tiếng Việt. Nếu không khớp quy tắc nào thì giữ nguyên.
export function translateBackendMessage(message: string): string {
  const exact = EXACT[message];
  if (exact !== undefined) return exact;

  for (const [pattern, toVi] of RULES) {
    const match = message.match(pattern);
    if (match) return toVi(match);
  }
  return message;
}

// Đọc body JSON của response lỗi và đổi trường message. Body không phải JSON thì giữ nguyên.
export function translateErrorBody(text: string): string {
  try {
    const json: unknown = JSON.parse(text);
    if (typeof json === "object" && json !== null && "message" in json) {
      const body = json as { message: unknown };
      if (typeof body.message === "string") {
        body.message = translateBackendMessage(body.message);
        return JSON.stringify(body);
      }
    }
  } catch {
    // Không phải JSON: trả về nguyên văn
  }
  return text;
}
