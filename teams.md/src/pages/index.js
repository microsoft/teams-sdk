"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
var router_1 = require("@docusaurus/router");
function Home() {
    return <router_1.Redirect to='welcome'/>;
}
