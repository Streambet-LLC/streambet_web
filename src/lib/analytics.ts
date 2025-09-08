export function initGoogleAnalytics(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const isProd = import.meta?.env?.VITE_BUGSNAG_SERVER === 'prod';
  if (!isProd) {
    return;
  }

  // Prevent duplicate injection
  if (document.querySelector('script[data-ga-loader="true"]')) {
    return;
  }

  const gaId = 'G-1MB4XM9R2E';

  // Load the gtag library
  const loaderScript = document.createElement('script');
  loaderScript.async = true;
  loaderScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  loaderScript.setAttribute('data-ga-loader', 'true');
  document.head.appendChild(loaderScript);

  // Initialize gtag
  const initScript = document.createElement('script');
  initScript.type = 'text/javascript';
  initScript.text = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);} 
    gtag('js', new Date());
    gtag('config', '${gaId}');
  `;
  document.head.appendChild(initScript);
}

export function initHotjar(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const isProd = import.meta?.env?.VITE_BUGSNAG_SERVER === 'prod';
  if (!isProd) {
    return;
  }

  // Prevent duplicate injection
  if (document.querySelector('script[data-hotjar-loader="true"]')) {
    return;
  }

  const hotjarId = 6477712;
  const hotjarSv = 6;

  // Inline init script (matches provided snippet behavior)
  const initScript = document.createElement('script');
  initScript.type = 'text/javascript';
  initScript.text = `
    (function(h,o,t,j,a,r){
        h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
        h._hjSettings={hjid:${hotjarId},hjsv:${hotjarSv}};
        a=o.getElementsByTagName('head')[0];
        r=o.createElement('script');r.async=1;
        r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
        r.setAttribute('data-hotjar-loader','true');
        a.appendChild(r);
    })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
  `;
  document.head.appendChild(initScript);
}
