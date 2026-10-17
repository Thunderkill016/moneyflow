package app.moneyflow.moneyflow

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * The `quick` extra crosses a trust boundary: MainActivity is exported,
 * so any installed app can send an explicit intent with an arbitrary
 * value. Only allowlisted actions may be forwarded to Dart — every
 * change to the accepted set must be locked down here.
 *
 * Pure-JVM coverage: QuickActionContract holds no Android dependencies.
 */
class QuickActionContractTest {
    @Test
    fun `capture and review are the accepted actions`() {
        assertEquals("capture", QuickActionContract.sanitize("capture"))
        // D18 — the widget's "Chờ duyệt" row deep-links to the inbox.
        assertEquals("review", QuickActionContract.sanitize("review"))
    }

    @Test
    fun `unknown values are dropped at the boundary`() {
        for (bogus in
            listOf(
                "CAPTURE",
                " capture",
                "capture ",
                "REVIEW",
                "review ",
                "delete",
                "settings",
                "0",
            )) {
            assertNull(bogus, QuickActionContract.sanitize(bogus))
        }
    }

    @Test
    fun `absent and blank extras produce no action`() {
        assertNull(QuickActionContract.sanitize(null))
        assertNull(QuickActionContract.sanitize(""))
        assertNull(QuickActionContract.sanitize("   "))
    }
}
