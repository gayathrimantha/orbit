package com.gayathrimantha.orbit.engine

import kotlinx.serialization.Serializable
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class FixtureTest {
    @Serializable
    data class Case(val now: Long, val snapshot: Snapshot)

    @Serializable
    data class Fixture(val name: String, val session: Session, val cases: List<Case>)

    private val fixtures: List<Fixture> by lazy {
        val text = javaClass.classLoader.getResource("engine.json")!!.readText()
        Engine.json.decodeFromString(text)
    }

    @Test
    fun matchesTypeScriptEngine() {
        assertTrue(fixtures.isNotEmpty())
        for (f in fixtures) {
            for (c in f.cases) {
                assertEquals(
                    c.snapshot,
                    Engine.snapshot(f.session, c.now),
                    "${f.name} at +${c.now - f.session.startedAt}ms",
                )
            }
        }
    }

    @Test
    fun pauseResumeSkipBackMirrorTypeScript() {
        val fresh = fixtures.first { it.name == "tabata fresh" }.session
        val t0 = fresh.startedAt

        val paused = Engine.pause(fresh, t0 + 83_000)
        assertEquals(83_000, Engine.snapshot(paused, t0 + 500_000).totalElapsedMs)

        val resumed = Engine.resume(Engine.pause(fresh, t0 + 65_000), t0 + 400_000)
        assertEquals(65_000, Engine.snapshot(resumed, t0 + 400_000).totalElapsedMs)

        val skipped = Engine.skip(fresh, t0 + 5_000)
        assertEquals(1, Engine.snapshot(skipped, t0 + 5_000).phaseIndex)
        assertEquals(0, Engine.snapshot(skipped, t0 + 5_000).phaseElapsedMs)

        val rewound = Engine.back(skipped, t0 + 6_000)
        assertEquals(0, Engine.snapshot(rewound, t0 + 6_000).phaseIndex)
    }
}
