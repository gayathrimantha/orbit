package com.gayathrimantha.orbit.wear

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.lifecycleScope

class MainActivity : ComponentActivity() {
    private lateinit var link: PhoneLink

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        link = PhoneLink(applicationContext, lifecycleScope)

        if (BuildConfig.DEBUG) {
            intent.getStringExtra("debugSession")?.let(link::injectForDebug)
        }

        setContent {
            val session by link.session.collectAsState()
            OrbitWearApp(session = session, onControl = link::control)
        }
    }

    override fun onStart() {
        super.onStart()
        link.start()
    }

    override fun onStop() {
        link.stop()
        super.onStop()
    }
}
