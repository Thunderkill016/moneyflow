package app.moneyflow.moneyflow

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * The whitelist IS the privacy boundary of the notification-listener pilot:
 * [NotificationCaptureService.onNotificationPosted] consults it before a
 * single byte of notification content is touched, so every change here must
 * be locked down by a test.
 *
 * Pure-JVM coverage (no Robolectric): the map has no Android dependencies.
 */
class BankNotificationSourcesTest {
    @Test
    fun `every pilot bank and wallet package is whitelisted`() {
        val expected =
            mapOf(
                "com.VCB" to "Vietcombank",
                "com.mbmobile" to "MB Bank",
                "vn.com.techcombank.bb.app" to "Techcombank",
                "mobile.acb.com.vn" to "ACB",
                "com.tpb.mb.gprsandroid" to "TPBank",
                "vn.com.bidv.bidvsmartbanking" to "BIDV",
                "com.vietinbank.ipay" to "VietinBank",
                "com.vnpay.vpbankonline" to "VPBank NEO",
                "com.vpbank.mobile" to "VPBank",
                "com.mservice.momotransfer" to "MoMo",
                "vn.com.vng.zalopay" to "ZaloPay",
                "vnpay.smartacccount" to "VNPAY",
                "com.vnpay.wallet" to "VNPAY",
            )
        assertEquals(expected, BankNotificationSources.byPackage)
    }

    @Test
    fun `non-bank packages are rejected before content is read`() {
        // Social, messaging and Google packages must never produce a label —
        // a label is the licence to read notification content.
        for (pkg in
            listOf(
                "com.zing.zalo",
                "com.facebook.orca",
                "com.google.android.gm",
                "com.android.systemui",
                "",
            )) {
            assertNull(pkg, BankNotificationSources.labelFor(pkg))
        }
        assertNull(BankNotificationSources.labelFor(null))
    }

    @Test
    fun `package matching is exact — case and suffix tricks do not pass`() {
        // Package names are case-sensitive on Android; "com.vcb" is NOT the
        // Vietcombank app id and must not silently match it.
        assertNull(BankNotificationSources.labelFor("com.vcb"))
        assertNull(BankNotificationSources.labelFor("com.VCB.evil"))
        assertNull(BankNotificationSources.labelFor("fake.com.VCB"))
    }
}
