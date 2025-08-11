import React from 'react';
import Bugsnag from '@bugsnag/js';
import BugsnagPluginReact from '@bugsnag/plugin-react';
// import BugsnagPerformance from '@bugsnag/browser-performance';

console.log(import.meta.env.VITE_BUGSNAG_SERVER,'Bugsnag initialized with key:', import.meta.env.VITE_BUGSNAG_KEY);
 
Bugsnag.start({
    apiKey: `${import.meta.env.VITE_BUGSNAG_KEY}`,
    plugins: [new BugsnagPluginReact()],
    releaseStage: `${import.meta.env.VITE_BUGSNAG_SERVER}`,
    enabledReleaseStages: ['Development','prod'],
    appVersion: 'StreamBet',
});

// BugsnagPerformance.start({ apiKey: `${process.env.NEXT_PUBLIC_BUGSNAG_KEY}` });
 
const BugSnagErrorBoundary: any =
    Bugsnag.getPlugin('react')?.createErrorBoundary(React);
 
export default BugSnagErrorBoundary;
