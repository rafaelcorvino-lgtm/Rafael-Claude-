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
import android.webkit.JavascriptInterface;
import android.graphics.Color;
import android.os.Build;
import android.Manifest;
import android.content.pm.PackageManager;
import java.io.InputStream;
import java.io.ByteArrayInputStream;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLDecoder;

public class MainActivity extends Activity {
    private WebView webView;
    private static final String LOCAL_HOST = "https://meteorologia.app/";
    private static final int LOCATION_PERMISSION_REQUEST = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        getWindow().setStatusBarColor(Color.parseColor("#0f1923"));

        // Request location permission at runtime (required for Android 6+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                }, LOCATION_PERMISSION_REQUEST);
            }
        }

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

        // Add JavaScript bridge for native HTTP calls
        webView.addJavascriptInterface(new WebBridge(), "NativeBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                WebResourceResponse proxyResponse = handleApiProxy(url);
                if (proxyResponse != null) {
                    return proxyResponse;
                }
                WebResourceResponse localResponse = serveLocalAsset(url);
                if (localResponse != null) {
                    return localResponse;
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                WebResourceResponse proxyResponse = handleApiProxy(url);
                if (proxyResponse != null) {
                    return proxyResponse;
                }
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

    /**
     * JavaScript bridge that performs HTTP GET requests natively.
     * This bypasses WebView's network restrictions.
     */
    private class WebBridge {
        @JavascriptInterface
        public String httpGet(String urlStr) {
            HttpURLConnection conn = null;
            try {
                URL url = new URL(urlStr);
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(15000);
                conn.setRequestProperty("Accept", "application/json");

                int code = conn.getResponseCode();
                if (code != 200) {
                    return "{\"_error\": true, \"_message\": \"HTTP " + code + "\"}";
                }

                BufferedReader reader = new BufferedReader(
                    new InputStreamReader(conn.getInputStream(), "UTF-8"));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                reader.close();
                return sb.toString();
            } catch (Exception e) {
                String msg = e.getMessage();
                if (msg == null) msg = "Unknown error";
                return "{\"_error\": true, \"_message\": \"" +
                    e.getClass().getSimpleName() + ": " +
                    msg.replace("\"", "'") + "\"}";
            } finally {
                if (conn != null) conn.disconnect();
            }
        }
    }

    private static final String API_PROXY_PREFIX = LOCAL_HOST + "api/proxy?url=";

    private WebResourceResponse handleApiProxy(String url) {
        if (url == null || !url.startsWith(API_PROXY_PREFIX)) {
            return null;
        }
        String encodedTarget = url.substring(API_PROXY_PREFIX.length());
        HttpURLConnection conn = null;
        try {
            String targetUrl = URLDecoder.decode(encodedTarget, "UTF-8");
            android.util.Log.d("Meteorologia", "API Proxy fetching: " + targetUrl);
            conn = (HttpURLConnection) new URL(targetUrl).openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(15000);
            conn.setRequestProperty("Accept", "application/json");
            conn.setRequestProperty("User-Agent", "MeteorologiaApp/1.0");

            int code = conn.getResponseCode();
            android.util.Log.d("Meteorologia", "API Proxy response code: " + code);

            StringBuilder sb = new StringBuilder();
            if (code == 200) {
                BufferedReader reader = new BufferedReader(
                    new InputStreamReader(conn.getInputStream(), "UTF-8"));
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                reader.close();
            } else {
                sb.append("{\"_error\":true,\"_message\":\"HTTP ").append(code).append("\"}");
            }

            byte[] bytes = sb.toString().getBytes("UTF-8");
            android.util.Log.d("Meteorologia", "API Proxy response length: " + bytes.length);

            java.util.Map<String, String> headers = new java.util.HashMap<>();
            headers.put("Access-Control-Allow-Origin", "*");
            headers.put("Cache-Control", "no-cache");

            return new WebResourceResponse(
                "application/json", "UTF-8",
                200, "OK", headers,
                new ByteArrayInputStream(bytes));
        } catch (Exception e) {
            android.util.Log.e("Meteorologia", "API Proxy error: " + e.getMessage());
            try {
                String errorJson = "{\"_error\":true,\"_message\":\"" +
                    e.getClass().getSimpleName() + ": " +
                    e.getMessage().replace("\"", "'") + "\"}";
                byte[] bytes = errorJson.getBytes("UTF-8");
                java.util.Map<String, String> headers = new java.util.HashMap<>();
                headers.put("Access-Control-Allow-Origin", "*");
                return new WebResourceResponse(
                    "application/json", "UTF-8",
                    200, "OK", headers,
                    new ByteArrayInputStream(bytes));
            } catch (Exception e2) {
                return null;
            }
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private WebResourceResponse serveLocalAsset(String url) {
        if (url != null && url.startsWith(LOCAL_HOST)) {
            String path = url.substring(LOCAL_HOST.length());
            int queryIdx = path.indexOf('?');
            if (queryIdx >= 0) {
                path = path.substring(0, queryIdx);
            }
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
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode == LOCATION_PERMISSION_REQUEST) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // Permission granted - reload to enable geolocation
                if (webView != null) {
                    webView.reload();
                }
            }
        }
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
