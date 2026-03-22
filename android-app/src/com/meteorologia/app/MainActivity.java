package com.meteorologia.app;

import android.app.Activity;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.ConsoleMessage;
import android.graphics.Color;
import android.os.Build;
import android.net.Uri;
import java.io.InputStream;
import java.io.IOException;

public class MainActivity extends Activity {
    private WebView webView;
    private static final String LOCAL_HOST = "https://meteorologia.app/";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        getWindow().setStatusBarColor(Color.parseColor("#0f1923"));

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setGeolocationDatabasePath(getFilesDir().getPath());
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setAllowFileAccessFromFileURLs(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        webView.setWebViewClient(new WebViewClient() {
            // API 21+ version (WebResourceRequest)
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                WebResourceResponse localResponse = serveLocalAsset(url);
                if (localResponse != null) {
                    return localResponse;
                }
                return super.shouldInterceptRequest(view, request);
            }

            // Legacy version (String url) for older WebViews
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                WebResourceResponse localResponse = serveLocalAsset(url);
                if (localResponse != null) {
                    return localResponse;
                }
                return super.shouldInterceptRequest(view, url);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url != null && url.startsWith(LOCAL_HOST)) {
                    view.loadUrl(url);
                    return true;
                }
                return false;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin,
                    GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                android.util.Log.d("Meteorologia", consoleMessage.message()
                    + " -- From line " + consoleMessage.lineNumber()
                    + " of " + consoleMessage.sourceId());
                return true;
            }
        });

        webView.setBackgroundColor(Color.parseColor("#0f1923"));
        webView.loadUrl(LOCAL_HOST + "index.html");
    }

    private WebResourceResponse serveLocalAsset(String url) {
        if (url != null && url.startsWith(LOCAL_HOST)) {
            String path = url.substring(LOCAL_HOST.length());
            // Remove query string if present
            int queryIdx = path.indexOf('?');
            if (queryIdx >= 0) {
                path = path.substring(0, queryIdx);
            }
            // Remove fragment
            int fragIdx = path.indexOf('#');
            if (fragIdx >= 0) {
                path = path.substring(0, fragIdx);
            }
            if (path.isEmpty() || path.equals("/")) {
                path = "index.html";
            }
            try {
                InputStream is = getAssets().open("www/" + path);
                String mimeType = getMimeType(path);
                return new WebResourceResponse(mimeType, "UTF-8", is);
            } catch (IOException e) {
                return null;
            }
        }
        return null;
    }

    private String getMimeType(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".js")) return "application/javascript";
        if (path.endsWith(".json")) return "application/json";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
        if (path.endsWith(".ico")) return "image/x-icon";
        return "application/octet-stream";
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
