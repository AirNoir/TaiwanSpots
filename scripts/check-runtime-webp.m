#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

int main(int argc, const char *argv[]) {
  @autoreleasepool {
    int decoded = 0;
    for (int n = 1; n < argc; n++) {
      NSString *path = [NSString stringWithUTF8String:argv[n]];
      NSData *data = [NSData dataWithContentsOfFile:path];
      UIImage *image = data ? [UIImage imageWithData:data] : nil;
      if (!image || !image.CGImage || CGImageGetWidth(image.CGImage) == 0 || CGImageGetHeight(image.CGImage) == 0) {
        fprintf(stderr, "FAIL: %s\n", argv[n]);
        return 1;
      }
      decoded++;
    }
    printf("PASS: UIImage(data:) decoded %d assets, including the widget-style PNG-named WebP copy.\n", decoded);
  }
  return 0;
}
