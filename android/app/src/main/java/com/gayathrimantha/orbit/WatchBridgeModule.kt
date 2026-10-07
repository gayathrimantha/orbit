package com.gayathrimantha.orbit

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import org.json.JSONObject

/**
 * Android end of the watch link, the counterpart of ios/Orbit/WatchBridge.swift
 * and exposed under the same name so src/watch.ts runs unchanged. The session
 * record goes to Wear OS as a Data Layer item, which the system syncs to the
 * watch even when the watch app isn't running. Controls tapped on the watch
 * arrive as messages carrying the tap's own timestamp.
 */
class WatchBridgeModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context), MessageClient.OnMessageReceivedListener {

    private val dataClient = Wearable.getDataClient(context)
    private val messageClient = Wearable.getMessageClient(context)
    private var listening = false

    override fun getName() = "WatchBridge"

    @ReactMethod
    fun sendSession(json: String?) {
        val request = PutDataMapRequest.create(SESSION_PATH).apply {
            // A changing timestamp guarantees delivery even when the payload repeats.
            dataMap.putLong("sentAt", System.currentTimeMillis())
            if (json != null) dataMap.putString("session", json)
        }.asPutDataRequest().setUrgent()
        dataClient.putDataItem(request).addOnFailureListener {
            Log.w(TAG, "putDataItem failed", it)
        }
    }

    @ReactMethod
    fun addListener(@Suppress("UNUSED_PARAMETER") eventName: String) {
        if (!listening) {
            messageClient.addListener(this)
            listening = true
        }
    }

    @ReactMethod
    fun removeListeners(@Suppress("UNUSED_PARAMETER") count: Double) {}

    override fun invalidate() {
        messageClient.removeListener(this)
        listening = false
        super.invalidate()
    }

    override fun onMessageReceived(event: MessageEvent) {
        if (event.path != CONTROL_PATH) return
        val payload = runCatching { JSONObject(String(event.data)) }.getOrNull() ?: return
        val body = Arguments.createMap().apply {
            putString("action", payload.optString("action"))
            putDouble("at", payload.optLong("at").toDouble())
        }
        context
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("watchControl", body)
    }

    companion object {
        private const val TAG = "WatchBridge"
        const val SESSION_PATH = "/orbit/session"
        const val CONTROL_PATH = "/orbit/control"
    }
}
