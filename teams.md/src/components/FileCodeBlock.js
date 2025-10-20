"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FileCodeBlock;
var react_1 = require("react");
var CodeBlock_1 = require("@theme/CodeBlock");
var useBaseUrl_1 = require("@docusaurus/useBaseUrl");
function FileCodeBlock(_a) {
    var _this = this;
    var src = _a.src, lang = _a.lang;
    var _b = (0, react_1.useState)(), code = _b[0], setCode = _b[1];
    var url = (0, useBaseUrl_1.default)(src);
    (0, react_1.useEffect)(function () {
        (function () { return __awaiter(_this, void 0, void 0, function () {
            var res, blob, data, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, fetch(url)];
                    case 1:
                        res = _a.sent();
                        if (!res.ok || res.status != 200) {
                            throw new Error("failed to load file code block with status \"".concat(res.status, "\""));
                        }
                        return [4 /*yield*/, res.blob()];
                    case 2:
                        blob = _a.sent();
                        return [4 /*yield*/, blob.text()];
                    case 3:
                        data = _a.sent();
                        setCode(data.trim());
                        return [3 /*break*/, 5];
                    case 4:
                        err_1 = _a.sent();
                        console.error('failed to load file code block', err_1);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        }); })();
    }, [src]);
    return (<CodeBlock_1.default title={process.env.NODE_ENV === 'development' ? src : undefined} language={lang}>
            {code}
        </CodeBlock_1.default>);
}
