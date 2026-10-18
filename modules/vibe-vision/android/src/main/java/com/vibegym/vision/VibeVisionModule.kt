package com.vibegym.vision

import android.net.Uri
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.google.android.gms.tasks.Task
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.common.MlKitException
import com.google.mlkit.common.model.LocalModel
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.label.ImageLabeler
import com.google.mlkit.vision.label.ImageLabeling
import com.google.mlkit.vision.label.custom.CustomImageLabelerOptions
import com.google.mlkit.vision.label.defaults.ImageLabelerOptions
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import org.json.JSONArray
import org.json.JSONObject

/**
 * Runs barcode scanning, Latin text recognition and image labeling on one
 * photo, all on the device, and resolves a JSON string:
 * { barcodes: string[], lines: {text, h}[], labels: {name, confidence, source}[], errors: string[] }
 *
 * Two labelers: the ML Kit base model ("Food", "Fruit"… source "base") and
 * EfficientNet-Lite2 trained on ImageNet, bundled in the app (orange, banana,
 * broccoli, pizza… source "imagenet").
 */
class VibeVisionModule(reactContext: ReactApplicationContext) :
  NativeVibeVisionSpec(reactContext) {

  override fun getName(): String = NAME

  // Loading the model takes a moment: keep it for the next photos.
  private var imagenetLabeler: ImageLabeler? = null

  private fun imagenet(): ImageLabeler =
    imagenetLabeler ?: ImageLabeling.getClient(
      CustomImageLabelerOptions.Builder(
        LocalModel.Builder().setAssetFilePath("models/efficientnet_lite2_int8.tflite").build(),
      )
        .setConfidenceThreshold(0.03f)
        .setMaxResultCount(10)
        .build(),
    ).also { imagenetLabeler = it }

  override fun invalidate() {
    super.invalidate()
    imagenetLabeler?.close()
    imagenetLabeler = null
  }

  override fun analyze(uri: String, promise: Promise) {
    val image = try {
      InputImage.fromFilePath(reactApplicationContext, Uri.parse(uri))
    } catch (e: Exception) {
      promise.reject("E_IMAGE", "Cannot read the photo", e)
      return
    }
    val scanner = BarcodeScanning.getClient(
      BarcodeScannerOptions.Builder()
        .setBarcodeFormats(
          Barcode.FORMAT_EAN_13,
          Barcode.FORMAT_EAN_8,
          Barcode.FORMAT_UPC_A,
          Barcode.FORMAT_UPC_E,
        )
        .build(),
    )
    val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    val labeler = ImageLabeling.getClient(
      ImageLabelerOptions.Builder().setConfidenceThreshold(0.3f).build(),
    )
    val codes = scanner.process(image)
    val text = recognizer.process(image)
    val labels = labeler.process(image)
    val objects = imagenet().process(image)

    Tasks.whenAllComplete(codes, text, labels, objects).addOnCompleteListener {
      val errors = JSONArray()
      fun fail(feature: String, task: Task<*>) {
        val e = task.exception
        val code =
          if (e is MlKitException && e.errorCode == MlKitException.UNAVAILABLE) "downloading"
          else "error"
        errors.put("$feature:$code")
      }

      val barcodes = JSONArray()
      if (codes.isSuccessful) codes.result.mapNotNull { it.rawValue }.distinct().forEach { barcodes.put(it) }
      else fail("barcode", codes)

      val lines = JSONArray()
      if (text.isSuccessful) {
        for (block in text.result.textBlocks) for (line in block.lines) {
          val h = line.boundingBox?.height() ?: 0
          lines.put(JSONObject().put("text", line.text).put("h", h.toDouble() / image.height.coerceAtLeast(1)))
        }
      } else fail("ocr", text)

      val found = JSONArray()
      fun add(source: String, task: Task<List<com.google.mlkit.vision.label.ImageLabel>>) {
        if (!task.isSuccessful) return fail(source, task)
        for (l in task.result) {
          found.put(
            JSONObject()
              .put("name", l.text)
              .put("confidence", l.confidence.toDouble())
              .put("source", source),
          )
        }
      }
      add("base", labels)
      add("imagenet", objects)

      scanner.close()
      recognizer.close()
      labeler.close()

      promise.resolve(
        JSONObject()
          .put("barcodes", barcodes)
          .put("lines", lines)
          .put("labels", found)
          .put("errors", errors)
          .toString(),
      )
    }
  }

  companion object {
    const val NAME = "VibeVision"
  }
}
