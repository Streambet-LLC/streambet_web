// iOS Safari drawer scroll fix (shared by index.html and hermes.html).
// This prevents the vaul drawer library from locking the body scroll.
(function () {
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    let observer;
    let intervalId;

    function removeFixedPosition() {
      const body = document.body;
      if (body.style.position === 'fixed' || body.style.position === 'fixed !important') {
        body.style.position = '';
        body.style.top = '';
        body.style.left = '';
        body.style.right = '';
        body.style.height = '';
        body.style.overflow = '';
        body.style.webkitOverflowScrolling = '';

        // Force reflow to ensure changes take effect
        body.offsetHeight;
      }
    }

    function startMonitoring() {
      // Use MutationObserver to watch for style changes
      observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            removeFixedPosition();
          }
        });
      });

      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['style'],
      });

      // Also use setInterval as backup
      intervalId = setInterval(removeFixedPosition, 100);
    }

    // Start monitoring when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startMonitoring);
    } else {
      startMonitoring();
    }

    // Cleanup function (optional)
    window.addEventListener('beforeunload', function () {
      if (observer) observer.disconnect();
      if (intervalId) clearInterval(intervalId);
    });
  }
})();
