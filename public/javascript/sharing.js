// Initialize popovers
const popoverTriggerList = document.querySelectorAll(
  '[data-bs-toggle="popover"]',
);
// eslint-disable-next-line no-unused-vars
const popoverList = [...popoverTriggerList].map(
  // eslint-disable-next-line no-undef
  (popoverTriggerEl) => new bootstrap.Popover(popoverTriggerEl),
);
