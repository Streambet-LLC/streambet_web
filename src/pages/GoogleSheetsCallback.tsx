import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { analyticsAPI } from '@/integrations/api/client';

/**
 * OAuth redirect target for the Google Sheets ingest flow.
 *
 * Google redirects here with `?code=…` after the admin grants access. We hand
 * the code to the API (which stores the token server-side keyed by admin id),
 * then either auto-close the popup or let the admin return to Analytics. The
 * Sellers tab can then read sheets without any token living in the browser.
 *
 * Register this page's URL as the redirect URI on the Google OAuth client and
 * in the API's GOOGLE_OAUTH_REDIRECT_URI env var.
 */
const GoogleSheetsCallback = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'working' | 'done' | 'error'>('working');
  const [message, setMessage] = useState('Connecting your Google account…');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // guard React 18 strict double-invoke
    ran.current = true;

    const error = params.get('error');
    const code = params.get('code');
    if (error) {
      setStatus('error');
      setMessage(`Google authorization was cancelled (${error}).`);
      return;
    }
    if (!code) {
      setStatus('error');
      setMessage('No authorization code was returned by Google.');
      return;
    }
    analyticsAPI
      .exchangeGoogleCode(code)
      .then(() => {
        setStatus('done');
        setMessage('Google connected. You can return to the Sellers tab.');
        // If we were opened as a popup, close shortly after success.
        if (window.opener) {
          setTimeout(() => window.close(), 1200);
        }
      })
      .catch((e: unknown) => {
        setStatus('error');
        setMessage(
          e instanceof Error ? e.message : 'Failed to connect Google account.',
        );
      });
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full rounded-xl border border-white/10 bg-[rgba(22,22,22,1)] p-8 text-center">
        {status === 'working' && (
          <Loader2 className="h-8 w-8 animate-spin text-[#B4FF39] mx-auto" />
        )}
        {status === 'done' && (
          <CheckCircle2 className="h-8 w-8 text-[#B4FF39] mx-auto" />
        )}
        {status === 'error' && (
          <XCircle className="h-8 w-8 text-rose-400 mx-auto" />
        )}
        <p className="mt-4 text-sm text-white/90">{message}</p>
        {status !== 'working' && (
          <Button
            className="mt-5 bg-[#B4FF39] text-black hover:bg-[#a2e833]"
            onClick={() => {
              if (window.opener) window.close();
              else navigate('/analytics');
            }}
          >
            {window.opener ? 'Close window' : 'Back to Analytics'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default GoogleSheetsCallback;
