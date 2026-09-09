export interface LeaveOptions {
  hasProgress: () => boolean;
  isRunning: () => boolean;
  pause?: () => void;
  resume?: () => void;
  setOpen: (open: boolean) => void;
}
export function createLeaveGuard(options: LeaveOptions) {
  let pending: ((allow: boolean) => void) | undefined;
  let resumeAfterDialog = false;
  function request(): boolean | Promise<boolean> {
    if (!options.hasProgress()) return true;
    if (pending) return false;
    resumeAfterDialog = options.isRunning();
    options.pause?.();
    options.setOpen(true);
    return new Promise((resolve) => {
      pending = resolve;
    });
  }
  function settle(allow: boolean) {
    options.setOpen(false);
    pending?.(allow);
    pending = undefined;
  }
  function cancel() {
    settle(false);
    if (resumeAfterDialog) options.resume?.();
    resumeAfterDialog = false;
  }
  return {
    request,
    cancel,
    confirm: () => settle(true),
    dispose: () => settle(false),
  };
}
