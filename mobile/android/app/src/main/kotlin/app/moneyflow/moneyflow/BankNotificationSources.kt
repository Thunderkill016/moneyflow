package app.moneyflow.moneyflow

/**
 * The ONLY packages the notification-listener pilot is allowed to read:
 * Vietnamese banks and e-wallets whose push notifications carry transaction
 * evidence. Anything not in this map is rejected before the notification's
 * content is ever touched — the whitelist is the privacy boundary, not a
 * convenience filter.
 *
 * Package ids come from public Play Store listings; notification coverage per
 * bank (which events push, and in which language/format) is NOT guaranteed by
 * this list — a real-device survey per source is required before any coverage
 * claim. Extend the map to add a source; never relax it without owner review.
 */
object BankNotificationSources {
    val byPackage: Map<String, String> =
        mapOf(
            // Vietcombank — VCB-Mobile B@nking.
            "com.VCB" to "Vietcombank",
            // MB Bank — MBBank app.
            "com.mbmobile" to "MB Bank",
            // Techcombank Mobile.
            "vn.com.techcombank.bb.app" to "Techcombank",
            // ACB ONE.
            "mobile.acb.com.vn" to "ACB",
            // TPBank Mobile.
            "com.tpb.mb.gprsandroid" to "TPBank",
            // BIDV SmartBanking.
            "vn.com.bidv.bidvsmartbanking" to "BIDV",
            // VietinBank iPay.
            "com.vietinbank.ipay" to "VietinBank",
            // VPBank NEO (current; built on the VNPAY stack).
            "com.vnpay.vpbankonline" to "VPBank NEO",
            // Legacy VPBank Online builds — kept for older installs.
            "com.vpbank.mobile" to "VPBank",
            // MoMo e-wallet.
            "com.mservice.momotransfer" to "MoMo",
            // ZaloPay e-wallet.
            "vn.com.vng.zalopay" to "ZaloPay",
            // VNPAY app (current listing — the id really has three c's).
            "vnpay.smartacccount" to "VNPAY",
            // Legacy Ví VNPAY builds.
            "com.vnpay.wallet" to "VNPAY",
        )

    /** Display label for [packageName], or null when the package is not a
     *  supported bank/wallet source. */
    fun labelFor(packageName: String?): String? = byPackage[packageName]
}
