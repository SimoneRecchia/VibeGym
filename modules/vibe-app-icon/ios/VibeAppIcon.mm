#import "VibeAppIcon.h"
#import <UIKit/UIKit.h>

/** Alternate app icons (compiled by Xcode from the AppIcon-<color>.icon files). */
@implementation VibeAppIcon

RCT_EXPORT_MODULE()

- (void)getIcon:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_main_queue(), ^{
    NSString *name = UIApplication.sharedApplication.alternateIconName;
    resolve(name != nil ? name : (id)[NSNull null]);
  });
}

- (void)setIcon:(NSString *)name resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_main_queue(), ^{
    UIApplication *app = UIApplication.sharedApplication;
    if (!app.supportsAlternateIcons) {
      reject(@"E_UNSUPPORTED", @"Alternate icons are not supported", nil);
      return;
    }
    [app setAlternateIconName:name
            completionHandler:^(NSError *_Nullable error) {
              if (error != nil) {
                reject(@"E_ICON", error.localizedDescription, error);
              } else {
                resolve(nil);
              }
            }];
  });
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeVibeAppIconSpecJSI>(params);
}

@end
