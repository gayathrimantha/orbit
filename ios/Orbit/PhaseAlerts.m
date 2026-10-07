#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PhaseAlerts, NSObject)

RCT_EXTERN_METHOD(requestPermission:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(schedule:(NSArray *)alerts)
RCT_EXTERN_METHOD(cancelAll)

@end
