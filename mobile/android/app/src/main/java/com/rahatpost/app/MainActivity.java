package com.rahatpost.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.google.android.gms.ads.MobileAds;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Initialize the Google Mobile Ads SDK on a background thread (v23+ recommendation)
        new Thread(() -> MobileAds.initialize(this, initializationStatus -> {})).start();
    }
}
