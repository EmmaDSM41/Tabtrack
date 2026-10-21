package com.tabtrack

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.paypal.android.corepayments.CoreConfig
import com.paypal.android.corepayments.Environment
import com.paypal.android.fraudprotection.PayPalDataCollector

class MagnesModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    // TODO: reemplaza con tu Client ID real de PayPal (sandbox por ahora)
    private val coreConfig = CoreConfig(
        clientId = "AeT5nxVmVd4UjhqI9KXzX-6a34pIYr7lSkAGT9czOMYjtdoOfGGSsu41jcBMI06Cnumr10So1cBhedde",
        environment = Environment.LIVE
    )

    private val dataCollector = PayPalDataCollector(coreConfig)

    override fun getName(): String = "MagnesModule"

    @ReactMethod
    fun collectDeviceData(promise: Promise) {
        try {
            val clientMetadataId = dataCollector.collectDeviceData(reactApplicationContext)
            promise.resolve(clientMetadataId)
        } catch (e: Exception) {
            promise.reject("FRAUD_PROTECTION_ERROR", e.message, e)
        }
    }
}