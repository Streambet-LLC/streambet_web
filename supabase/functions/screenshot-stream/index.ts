import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import puppeteer from 'https://deno.land/x/puppeteer@16.2.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { streamId, embedUrl } = await req.json();

    if (!streamId || !embedUrl) {
      console.error('Missing required parameters:', { streamId, embedUrl });
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log('Attempting to capture screenshot for stream:', { streamId, embedUrl });

    // Initialize browser with Deno-compatible configurations
    const browser = await puppeteer
      .launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-extensions',
          '--disable-software-rasterizer',
          '--headless',
          '--disable-web-security',
        ],
        ignoreHTTPSErrors: true,
        headless: true,
        env: {
          PUPPETEER_PRODUCT: 'chrome',
        },
      })
      .catch(error => {
        console.error('Failed to launch browser:', error);
        throw new Error(`Browser launch failed: ${error.message}`);
      });

    console.log('Browser launched successfully');

    const page = await browser.newPage().catch(error => {
      console.error('Failed to create new page:', error);
      browser.close();
      throw new Error('Failed to create new page');
    });

    console.log('New page created');

    // Set viewport for consistent thumbnails
    await page.setViewport({ width: 1280, height: 720 });
    console.log('Viewport set');

    try {
      await page.goto(embedUrl, {
        waitUntil: 'networkidle0',
        timeout: 30000, // 30 seconds timeout
      });
      console.log('Navigation to embed URL successful');
    } catch (error) {
      console.error('Navigation failed:', error);
      await browser.close();
      throw new Error('Failed to load embed URL');
    }

    // Wait for content to load
    await page.waitForTimeout(5000);
    console.log('Waited for content loading');

    // Take screenshot
    const screenshot = await page
      .screenshot({
        type: 'jpeg',
        quality: 80,
        fullPage: false,
      })
      .catch(error => {
        console.error('Screenshot failed:', error);
        throw new Error('Failed to capture screenshot');
      });

    console.log('Screenshot captured successfully');

    await browser.close();
    console.log('Browser closed');

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Upload screenshot to storage
    const filePath = `thumbnails/${streamId}-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('stream-thumbnails')
      .upload(filePath, screenshot, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading thumbnail:', uploadError);
      throw uploadError;
    }

    console.log('Screenshot uploaded successfully');

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('stream-thumbnails').getPublicUrl(filePath);

    // Update stream with new thumbnail
    const { error: updateError } = await supabase
      .from('streams')
      .update({ thumbnail_url: publicUrl })
      .eq('id', streamId);

    if (updateError) {
      console.error('Error updating stream:', updateError);
      throw updateError;
    }

    console.log('Stream updated with new thumbnail URL');

    return new Response(JSON.stringify({ success: true, thumbnail: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in screenshot-stream function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: 'Check function logs for more information',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
