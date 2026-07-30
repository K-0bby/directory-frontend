export interface ListingFormHandle {
  submit: () => Promise<unknown | boolean>;
  /** Only implemented by the final review/submit step — opens its "preview as visitor" dialog. */
  openPreview?: () => void;
}
