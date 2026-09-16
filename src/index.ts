export {
  artifactEscapeCodeForImage,
  defaultMode,
  escapeCodeForImage,
  itermEscapeCodeForImage,
  type InlineScreenshotMode,
} from "./escape-codes";
export { printInlineImage } from "./print";
export {
  InlineScreenshotReporter,
  type InlineScreenshotReporterOptions,
} from "./reporter";

import { InlineScreenshotReporter as DefaultReporter } from "./reporter";

export default DefaultReporter;
