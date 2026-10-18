package com.vibegym.appicon

import android.content.ComponentName
import android.content.pm.ActivityInfo
import android.content.pm.PackageManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext

/**
 * The launcher icons are activity-aliases named "<package>.Icon<Key>" in the
 * app manifest, one per color, exactly one enabled. Switching enables the new
 * alias before disabling the old one, so the app never loses its launcher.
 */
class VibeAppIconModule(reactContext: ReactApplicationContext) :
  NativeVibeAppIconSpec(reactContext) {

  override fun getName(): String = NAME

  private val pm: PackageManager get() = reactApplicationContext.packageManager
  private val prefix: String get() = "${reactApplicationContext.packageName}.Icon"

  private fun aliases(): List<ActivityInfo> {
    @Suppress("DEPRECATION")
    val info = pm.getPackageInfo(
      reactApplicationContext.packageName,
      PackageManager.GET_ACTIVITIES or PackageManager.MATCH_DISABLED_COMPONENTS,
    )
    return info.activities.orEmpty().filter { it.targetActivity != null && it.name.startsWith(prefix) }
  }

  private fun component(a: ActivityInfo) = ComponentName(reactApplicationContext.packageName, a.name)

  private fun isEnabled(a: ActivityInfo): Boolean =
    when (pm.getComponentEnabledSetting(component(a))) {
      PackageManager.COMPONENT_ENABLED_STATE_ENABLED -> true
      PackageManager.COMPONENT_ENABLED_STATE_DEFAULT -> a.enabled
      else -> false
    }

  override fun getIcon(promise: Promise) {
    try {
      promise.resolve(aliases().firstOrNull { isEnabled(it) }?.name?.removePrefix(prefix))
    } catch (e: Exception) {
      promise.reject("E_ICON", e.message, e)
    }
  }

  override fun setIcon(name: String?, promise: Promise) {
    try {
      val all = aliases()
      val target = all.firstOrNull { it.name == prefix + name }
      if (target == null) {
        promise.reject("E_ICON", "Unknown icon $name")
        return
      }
      pm.setComponentEnabledSetting(
        component(target),
        PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
        PackageManager.DONT_KILL_APP,
      )
      for (a in all) {
        if (a.name != target.name && isEnabled(a)) {
          pm.setComponentEnabledSetting(
            component(a),
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP,
          )
        }
      }
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("E_ICON", e.message, e)
    }
  }

  companion object {
    const val NAME = "VibeAppIcon"
  }
}
