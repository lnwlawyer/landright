import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./browser-tests', fullyParallel:true, workers:2, retries:0,
 use:{baseURL:'http://127.0.0.1:8011',headless:true,launchOptions:process.env.SMT2_CHROMIUM_PATH?{executablePath:process.env.SMT2_CHROMIUM_PATH}:{}},
 webServer:{command:'python3 -m http.server 8011 --bind 127.0.0.1',url:'http://127.0.0.1:8011',reuseExistingServer:false},
 projects:[{name:'desktop',use:{viewport:{width:1280,height:800}}},{name:'mobile',use:{viewport:{width:390,height:844}}}],
});
