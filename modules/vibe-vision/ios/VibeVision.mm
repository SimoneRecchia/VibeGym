#import "VibeVision.h"
#import <Vision/Vision.h>

/**
 * Barcodes, text and image classification on one photo with Apple's Vision
 * framework (on device). Resolves the same JSON as the Android module.
 */
@implementation VibeVision

RCT_EXPORT_MODULE()

- (void)analyze:(NSString *)uri
        resolve:(RCTPromiseResolveBlock)resolve
         reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
    NSURL *url = [NSURL URLWithString:uri];
    if (url == nil || url.scheme == nil) {
      url = [NSURL fileURLWithPath:uri];
    }
    VNImageRequestHandler *handler = [[VNImageRequestHandler alloc] initWithURL:url options:@{}];

    VNDetectBarcodesRequest *codes = [VNDetectBarcodesRequest new];
    codes.symbologies = @[ VNBarcodeSymbologyEAN13, VNBarcodeSymbologyEAN8, VNBarcodeSymbologyUPCE ];

    VNRecognizeTextRequest *text = [VNRecognizeTextRequest new];
    text.recognitionLevel = VNRequestTextRecognitionLevelAccurate;
    text.recognitionLanguages = @[ @"it-IT", @"en-US" ];
    text.usesLanguageCorrection = YES;

    VNClassifyImageRequest *classify = [VNClassifyImageRequest new];

    NSError *error = nil;
    BOOL ok = [handler performRequests:@[ codes, text, classify ] error:&error];
    if (!ok && error != nil) {
      reject(@"E_IMAGE", error.localizedDescription, error);
      return;
    }

    NSMutableArray *barcodes = [NSMutableArray new];
    for (VNBarcodeObservation *o in codes.results) {
      if (o.payloadStringValue != nil && ![barcodes containsObject:o.payloadStringValue]) {
        [barcodes addObject:o.payloadStringValue];
      }
    }

    NSMutableArray *lines = [NSMutableArray new];
    for (VNRecognizedTextObservation *o in text.results) {
      VNRecognizedText *best = [[o topCandidates:1] firstObject];
      if (best != nil) {
        [lines addObject:@{ @"text" : best.string, @"h" : @(o.boundingBox.size.height) }];
      }
    }

    NSMutableArray *labels = [NSMutableArray new];
    for (VNClassificationObservation *o in classify.results) {
      if (o.confidence >= 0.3) {
        [labels addObject:@{ @"name" : o.identifier, @"confidence" : @(o.confidence) }];
      }
    }

    NSDictionary *out = @{ @"barcodes" : barcodes, @"lines" : lines, @"labels" : labels, @"errors" : @[] };
    NSData *json = [NSJSONSerialization dataWithJSONObject:out options:0 error:nil];
    resolve([[NSString alloc] initWithData:json encoding:NSUTF8StringEncoding]);
  });
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeVibeVisionSpecJSI>(params);
}

@end
