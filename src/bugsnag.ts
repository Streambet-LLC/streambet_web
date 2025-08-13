import React from 'react';
import Bugsnag from '@bugsnag/js';
import BugsnagPluginReact from '@bugsnag/plugin-react';

 
Bugsnag.start({
    apiKey: `${import.meta.env.VITE_BUGSNAG_KEY}`,
    plugins: [new BugsnagPluginReact()],
    releaseStage: `${import.meta.env.VITE_BUGSNAG_SERVER}`,
    enabledReleaseStages: ['Development','prod'],
    appVersion: 'StreamBet',
});

 
const BugSnagErrorBoundary: any =
    Bugsnag.getPlugin('react')?.createErrorBoundary(React);
 
export default BugSnagErrorBoundary;
