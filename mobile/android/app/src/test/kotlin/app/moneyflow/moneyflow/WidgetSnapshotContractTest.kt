package app.moneyflow.moneyflow

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * JVM coverage for the widget's last-known-balance contract: parse
 * strictness, the >24h staleness boundary, and vi-VN formatting. The
 * labels are fixed strings here — on-device they come from
 * SimpleDateFormat in the provider.
 */
class WidgetSnapshotContractTest {
    private val now = 1_000_000_000_000L

    private fun render(
        snapshot: WidgetSnapshotContract.Snapshot?,
        at: Long = now,
    ) = WidgetSnapshotContract.render(
        snapshot,
        at,
        timeLabel = { "TT:TT" },
        dateTimeLabel = { "DD/MM" },
    )

    @Test
    fun `a full snapshot decodes`() {
        val snap = WidgetSnapshotContract.parse(
            """{"total":1234567,"safeSpend":89000,"savedAtMs":999999999000}""",
        )
        assertEquals(
            WidgetSnapshotContract.Snapshot(1234567L, 89000L, 999999999000L),
            snap,
        )
    }

    @Test
    fun `the pending-review count decodes when present`() {
        val snap = WidgetSnapshotContract.parse(
            """{"total":5,"safeSpend":null,"savedAtMs":1,"pendingReview":3}""",
        )
        assertEquals(3L, snap?.pendingReview)
    }

    @Test
    fun `absent or null pending-review decodes as unknown`() {
        assertNull(
            WidgetSnapshotContract.parse(
                """{"total":5,"safeSpend":null,"savedAtMs":1}""",
            )?.pendingReview,
        )
        assertNull(
            WidgetSnapshotContract.parse(
                """{"total":5,"safeSpend":null,"savedAtMs":1,"pendingReview":null}""",
            )?.pendingReview,
        )
    }

    @Test
    fun `a negative pending count reads as zero — never a minus queue`() {
        val snap = WidgetSnapshotContract.parse(
            """{"total":5,"safeSpend":null,"savedAtMs":1,"pendingReview":-4}""",
        )
        assertEquals(0L, snap?.pendingReview)
    }

    @Test
    fun `a null safeSpend decodes as absent`() {
        val snap = WidgetSnapshotContract.parse(
            """{"total":5,"safeSpend":null,"savedAtMs":1}""",
        )
        assertEquals(WidgetSnapshotContract.Snapshot(5L, null, 1L), snap)
    }

    @Test
    fun `absent and malformed payloads read as no snapshot`() {
        for (bogus in listOf(null, "", "{", "[]", "5", "\"x\"")) {
            assertNull(bogus, WidgetSnapshotContract.parse(bogus))
        }
        // Missing fields and wrong types are just as absent.
        assertNull(WidgetSnapshotContract.parse("""{"total":1}"""))
        assertNull(
            WidgetSnapshotContract.parse(
                """{"total":"abc","safeSpend":1,"savedAtMs":1}""",
            ),
        )
    }

    @Test
    fun `a fresh snapshot renders both figures with its update time`() {
        val r = render(
            WidgetSnapshotContract.Snapshot(1234567L, 89000L, now - 60_000),
        )
        assertEquals("1.234.567 ₫", r.total)
        assertEquals("89.000 ₫", r.safeSpend)
        assertEquals("Cập nhật lúc TT:TT", r.caption)
    }

    @Test
    fun `a fresh snapshot with a review count renders the row`() {
        val r = render(
            WidgetSnapshotContract.Snapshot(
                500L,
                null,
                now,
                pendingReview = 4,
            ),
        )
        assertEquals("4 mục", r.review)
    }

    @Test
    fun `a verified zero review count still renders — it is the all-clear`() {
        val r = render(
            WidgetSnapshotContract.Snapshot(
                500L,
                null,
                now,
                pendingReview = 0,
            ),
        )
        assertEquals("0 mục", r.review)
    }

    @Test
    fun `an unknown review count hides the row`() {
        val r = render(WidgetSnapshotContract.Snapshot(500L, null, now))
        assertNull(r.review)
    }

    @Test
    fun `no budget headroom keeps the honest dash`() {
        val r = render(WidgetSnapshotContract.Snapshot(500L, null, now))
        assertEquals("500 ₫", r.total)
        assertEquals(WidgetSnapshotContract.NO_VALUE, r.safeSpend)
        assertEquals("Cập nhật lúc TT:TT", r.caption)
    }

    @Test
    fun `older than a day hides every figure behind the dash`() {
        val stale = WidgetSnapshotContract.Snapshot(
            123L,
            45L,
            now - WidgetSnapshotContract.STALE_AFTER_MS - 1,
        )
        val r = render(stale)
        assertEquals(WidgetSnapshotContract.NO_VALUE, r.total)
        assertEquals(WidgetSnapshotContract.NO_VALUE, r.safeSpend)
        assertEquals("Dữ liệu cũ từ DD/MM — chạm để mở", r.caption)
        // A stale snapshot can't vouch for the queue either — row hides.
        assertNull(r.review)
    }

    @Test
    fun `exactly a day old is still fresh`() {
        assertFalse(
            WidgetSnapshotContract.isStale(
                now - WidgetSnapshotContract.STALE_AFTER_MS,
                now,
            ),
        )
        assertTrue(
            WidgetSnapshotContract.isStale(
                now - WidgetSnapshotContract.STALE_AFTER_MS - 1,
                now,
            ),
        )
    }

    @Test
    fun `an absent snapshot renders the open-the-app state`() {
        val r = render(null)
        assertEquals(WidgetSnapshotContract.NO_VALUE, r.total)
        assertEquals(WidgetSnapshotContract.NO_VALUE, r.safeSpend)
        assertEquals("Chạm để mở MoneyFlow", r.caption)
        assertNull(r.review)
    }

    @Test
    fun `formatVnd groups thousands with dots`() {
        assertEquals("0 ₫", WidgetSnapshotContract.formatVnd(0))
        assertEquals("999 ₫", WidgetSnapshotContract.formatVnd(999))
        assertEquals("1.000 ₫", WidgetSnapshotContract.formatVnd(1000))
        assertEquals("1.234.567 ₫", WidgetSnapshotContract.formatVnd(1234567))
        assertEquals("-45.000 ₫", WidgetSnapshotContract.formatVnd(-45000))
        // MIN_VALUE overflows abs() — the sign-strip path must not.
        assertEquals(
            "-9.223.372.036.854.775.808 ₫",
            WidgetSnapshotContract.formatVnd(Long.MIN_VALUE),
        )
    }
}
