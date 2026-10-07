package com.gayathrimantha.cadence.wear

import android.content.Context
import android.net.Uri
import android.util.Log
import com.gayathrimantha.cadence.engine.Engine
import com.gayathrimantha.cadence.engine.Session
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.PutDataRequest
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import org.json.JSONObject

/**
 * Mirrors the phone's session, the Wear OS counterpart of the watchOS
 * PhoneLink. The phone writes the whole session record to a Data Layer item
 * whenever it changes; controls tapped here are applied immediately with the
 * Kotlin engine and messaged to the phone with their timestamp, so both sides
 * compute the same result.
 */
class PhoneLink(context: Context, private val scope: CoroutineScope) :
    DataClient.OnDataChangedListener {

    enum class Control(val wire: String) { PAUSE("pause"), RESUME("resume"), SKIP("skip"), BACK("back") }

    private val dataClient = Wearable.getDataClient(context)
    private val messageClient = Wearable.getMessageClient(context)
    private val nodeClient = Wearable.getNodeClient(context)

    private val _session = MutableStateFlow<Session?>(null)
    val session: StateFlow<Session?> = _session

    fun start() {
        dataClient.addListener(this)
        scope.launch {
            // Pick up the last session the phone wrote, even from before launch.
            val uri = Uri.Builder().scheme(PutDataRequest.WEAR_URI_SCHEME).path(SESSION_PATH).build()
            runCatching { dataClient.getDataItems(uri).await() }
                .onSuccess { buffer ->
                    buffer.lastOrNull()?.let { apply(DataMapItem.fromDataItem(it).dataMap.getString("session")) }
                    buffer.release()
                }
                .onFailure { Log.w(TAG, "getDataItems failed", it) }
        }
    }

    fun stop() = dataClient.removeListener(this)

    fun control(action: Control) {
        val s = _session.value ?: return
        val now = System.currentTimeMillis()
        _session.value = when (action) {
            Control.PAUSE -> Engine.pause(s, now)
            Control.RESUME -> Engine.resume(s, now)
            Control.SKIP -> Engine.skip(s, now)
            Control.BACK -> Engine.back(s, now)
        }
        val payload = JSONObject().put("action", action.wire).put("at", now).toString().toByteArray()
        scope.launch {
            runCatching {
                nodeClient.connectedNodes.await().forEach { node ->
                    messageClient.sendMessage(node.id, CONTROL_PATH, payload).await()
                }
            }.onFailure { Log.w(TAG, "sendMessage failed", it) }
        }
    }

    /** Debug builds only: lets a session be injected with adb to exercise the UI. */
    fun injectForDebug(json: String) = apply(json)

    override fun onDataChanged(events: DataEventBuffer) {
        events.filter { it.type == DataEvent.TYPE_CHANGED && it.dataItem.uri.path == SESSION_PATH }
            .lastOrNull()
            ?.let { apply(DataMapItem.fromDataItem(it.dataItem).dataMap.getString("session")) }
        events.release()
    }

    private fun apply(json: String?) {
        _session.value = json?.let {
            runCatching { Engine.json.decodeFromString<Session>(it) }
                .onFailure { e -> Log.w(TAG, "bad session payload", e) }
                .getOrNull()
        }
    }

    companion object {
        private const val TAG = "PhoneLink"
        const val SESSION_PATH = "/cadence/session"
        const val CONTROL_PATH = "/cadence/control"
    }
}
