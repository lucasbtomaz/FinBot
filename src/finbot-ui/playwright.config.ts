import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',workers:1,retries:0,timeout:30000,
 use:{baseURL:'http://127.0.0.1:4179',channel:'msedge',headless:true,viewport:{width:1440,height:1100},trace:'retain-on-failure'},
 webServer:{command:'npm.cmd run preview -- --host 127.0.0.1 --port 4179 --strictPort',url:'http://127.0.0.1:4179',reuseExistingServer:false},
});
