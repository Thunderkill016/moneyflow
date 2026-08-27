import Link from "next/link";
import { buildLabel } from "@/lib/build-identity";
import styles from "@/components/security-page.module.css";

/*
 * Public security page.
 *
 * Every commercial product in this category publishes one; MoneyFlow did not,
 * while already doing most of what such a page describes. The content here is
 * gathered from what the repository demonstrably does, not from what a security
 * page conventionally claims.
 *
 * It is split three ways on purpose, because conflating them is how these pages
 * become untrustworthy: what this product does, what the platform underneath it
 * provides, and what does not exist at all. The third section is the reason the
 * first two are worth reading.
 */

export function SecurityPage() {
  return (
    <main className={styles.page}>
      <Link className={styles.back} href="/">
        ← MoneyFlow
      </Link>

      <p className={styles.eyebrow}>Bảo mật</p>
      <h1 className={styles.title}>Sản phẩm này được bảo vệ thế nào</h1>
      <p className={styles.lead}>
        Trang này tách ba thứ hay bị gộp lẫn: điều MoneyFlow tự làm, điều nền
        tảng bên dưới cung cấp, và điều <strong>chưa có</strong>. Phần thứ ba là
        lý do hai phần đầu đáng tin.
      </p>
      <p className={styles.updated}>Cập nhật: tháng 8/2026</p>

      <section className={styles.section} aria-labelledby="security-product">
        <h2 id="security-product">Điều MoneyFlow làm</h2>
        <p className={styles.sectionNote}>
          Những điểm dưới đây nằm trong mã nguồn và migration của sản phẩm, không
          phải chính sách viết ra rồi để đó.
        </p>
        <ul className={styles.list}>
          <li>
            <strong>Không bao giờ hỏi mật khẩu ngân hàng.</strong> MoneyFlow
            không yêu cầu, không lưu và không cần mật khẩu internet banking, mã
            OTP hay liên kết Open Banking. Bạn tự ghi, dán văn bản, hoặc tải lên
            tệp bạn chọn.
          </li>
          <li>
            <strong>Sổ của bạn tách khỏi mọi người khác ở tầng cơ sở dữ liệu.</strong>{" "}
            Mỗi hàng gắn với chủ sở hữu bằng Row Level Security, và quan hệ giữa
            các bảng được ràng buộc kèm định danh người dùng — nên một hàng không
            thể trỏ sang dữ liệu của người khác kể cả khi ứng dụng có lỗi.
          </li>
          <li>
            <strong>Quy tắc tiền được ép ở cơ sở dữ liệu.</strong> Số tiền là số
            nguyên đồng, chuyển khoản luôn cân bằng giữa hai ví của bạn, và các
            bút toán đã chốt sao kê bị khoá lại — không phải bằng quy ước trong
            mã, mà bằng ràng buộc.
          </li>
          <li>
            <strong>Xoá nhầm khôi phục được.</strong> Hành động xoá trên sổ là xoá
            mềm và phục hồi được.
          </li>
          <li>
            <strong>Xoá tài khoản là xoá ngay.</strong> Khi bạn xoá tài khoản, dữ
            liệu của bạn bị xoá khỏi cơ sở dữ liệu ứng dụng lập tức, không có cửa
            sổ giữ lại.
          </li>
          <li>
            <strong>Mỗi thay đổi mã nguồn đều bị quét.</strong> Phân tích bảo mật
            mã tự động, dò khoá bí mật trên toàn bộ lịch sử, và theo dõi lỗ hổng
            thư viện — chạy trên từng thay đổi trước khi vào sản phẩm.
          </li>
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="security-platform">
        <h2 id="security-platform">Điều nền tảng cung cấp</h2>
        <p className={styles.sectionNote}>
          MoneyFlow chạy trên hạ tầng của bên thứ ba. Những điểm này do họ bảo
          đảm — chúng tôi nêu ra và nói rõ đó không phải thứ chúng tôi tự kiểm
          chứng được.
        </p>
        <ul className={styles.list}>
          <li>
            <strong>Đường truyền được mã hoá.</strong> Mọi kết nối tới MoneyFlow
            đi qua HTTPS và trình duyệt được yêu cầu chỉ dùng HTTPS cho những lần
            sau.
          </li>
          <li>
            <strong>Mã hoá khi lưu trữ và sao lưu của nhà cung cấp</strong> do
            nền tảng cơ sở dữ liệu đảm nhiệm theo cam kết của họ.
          </li>
        </ul>
      </section>

      <section className={styles.absent} aria-labelledby="security-absent">
        <h2 id="security-absent">Điều MoneyFlow chưa có</h2>
        <p className={styles.sectionNote}>
          Các sản phẩm lớn cùng ngành có những thứ dưới đây. MoneyFlow thì chưa,
          và nói ra thì đúng hơn là im lặng.
        </p>
        <ul className={styles.list}>
          <li>Chưa có chứng nhận kiểm toán bảo mật độc lập (ví dụ SOC 2).</li>
          <li>Chưa có chương trình thưởng lỗi bảo mật.</li>
          <li>Chưa có kiểm thử xâm nhập do bên thứ ba thực hiện.</li>
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="security-report">
        <h2 id="security-report">Báo lỗi bảo mật</h2>
        <p className={styles.sectionNote}>
          Nếu bạn tìm thấy lỗ hổng, hãy báo riêng tư qua GitHub thay vì đăng công
          khai. Đừng kèm thông tin đăng nhập, dữ liệu cá nhân, hay dữ liệu tài
          chính của người khác trong báo cáo.
        </p>
        <a
          className={styles.report}
          href="https://github.com/Thunderkill016/moneyflow/security/advisories/new"
          rel="noreferrer noopener"
        >
          Báo lỗi bảo mật riêng tư
        </a>
        {/*
          * The running build, next to the place someone reports a problem from.
          * A report that cannot be tied to a build is a report nobody can act
          * on, and this is the moment the reader needs the number.
          */}
        <p className={styles.build}>{buildLabel()}</p>
      </section>
    </main>
  );
}
