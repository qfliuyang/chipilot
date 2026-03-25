//# hash=91563e58be44ca48226f24dde06b8f93
//# sourceMappingURL=MockDetector.js.map

/**
 * MockDetector - Validates that tests aren't over-mocked
 *
 * Scans test files and runtime behavior to detect:
 * - Excessive use of jest.mock/vi.mock
 * - Mocked PTY that doesn't match real PTY behavior
 * - Fake timers/async that hide real timing issues
 */ function _array_like_to_array(arr, len) {
    if (len == null || len > arr.length) len = arr.length;
    for(var i = 0, arr2 = new Array(len); i < len; i++)arr2[i] = arr[i];
    return arr2;
}
function _array_without_holes(arr) {
    if (Array.isArray(arr)) return _array_like_to_array(arr);
}
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
    try {
        var info = gen[key](arg);
        var value = info.value;
    } catch (error) {
        reject(error);
        return;
    }
    if (info.done) {
        resolve(value);
    } else {
        Promise.resolve(value).then(_next, _throw);
    }
}
function _async_to_generator(fn) {
    return function() {
        var self = this, args = arguments;
        return new Promise(function(resolve, reject) {
            var gen = fn.apply(self, args);
            function _next(value) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
            }
            function _throw(err) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
            }
            _next(undefined);
        });
    };
}
function _class_call_check(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}
function _defineProperties(target, props) {
    for(var i = 0; i < props.length; i++){
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
    }
}
function _create_class(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
}
function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
function _iterable_to_array(iter) {
    if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
}
function _non_iterable_spread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _to_consumable_array(arr) {
    return _array_without_holes(arr) || _iterable_to_array(arr) || _unsupported_iterable_to_array(arr) || _non_iterable_spread();
}
function _unsupported_iterable_to_array(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _array_like_to_array(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(n);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _array_like_to_array(o, minLen);
}
function _ts_generator(thisArg, body) {
    var f, y, t, _ = {
        label: 0,
        sent: function() {
            if (t[0] & 1) throw t[1];
            return t[1];
        },
        trys: [],
        ops: []
    }, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype), d = Object.defineProperty;
    return d(g, "next", {
        value: verb(0)
    }), d(g, "throw", {
        value: verb(1)
    }), d(g, "return", {
        value: verb(2)
    }), typeof Symbol === "function" && d(g, Symbol.iterator, {
        value: function() {
            return this;
        }
    }), g;
    function verb(n) {
        return function(v) {
            return step([
                n,
                v
            ]);
        };
    }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while(g && (g = 0, op[0] && (_ = 0)), _)try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [
                op[0] & 2,
                t.value
            ];
            switch(op[0]){
                case 0:
                case 1:
                    t = op;
                    break;
                case 4:
                    _.label++;
                    return {
                        value: op[1],
                        done: false
                    };
                case 5:
                    _.label++;
                    y = op[1];
                    op = [
                        0
                    ];
                    continue;
                case 7:
                    op = _.ops.pop();
                    _.trys.pop();
                    continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                        _ = 0;
                        continue;
                    }
                    if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                        _.label = op[1];
                        break;
                    }
                    if (op[0] === 6 && _.label < t[1]) {
                        _.label = t[1];
                        t = op;
                        break;
                    }
                    if (t && _.label < t[2]) {
                        _.label = t[2];
                        _.ops.push(op);
                        break;
                    }
                    if (t[2]) _.ops.pop();
                    _.trys.pop();
                    continue;
            }
            op = body.call(thisArg, _);
        } catch (e) {
            op = [
                6,
                e
            ];
            y = 0;
        } finally{
            f = t = 0;
        }
        if (op[0] & 5) throw op[1];
        return {
            value: op[0] ? op[1] : void 0,
            done: true
        };
    }
}
export var MockDetector = /*#__PURE__*/ function() {
    "use strict";
    function MockDetector() {
        _class_call_check(this, MockDetector);
        _define_property(this, "suspiciousPatterns", [
            /vi\.mock\s*\(/g,
            /jest\.mock\s*\(/g,
            /mockImplementation\s*\(/g,
            /mockReturnValue\s*\(/g,
            /useFakeTimers\s*\(/g,
            /MOCK_PTY/g,
            /FAKE_TERMINAL/g,
            /skip.*real.*pty/gi,
            /mock.*ansi/gi
        ]);
        _define_property(this, "requiredRealPatterns", [
            /node-pty/g,
            /pty\.spawn/g,
            /spawn.*node.*cli/g,
            /onData.*=>/g,
            /write\s*\(.*\r/g
        ]);
    }
    _create_class(MockDetector, [
        {
            /**
   * Analyzes a test file for mock vs real implementation usage
   */ key: "analyzeTestFile",
            value: function analyzeTestFile(filePath, content) {
                var mockMatches = [];
                var realMatches = [];
                var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                try {
                    // Count suspicious mock patterns
                    for(var _iterator = this.suspiciousPatterns[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                        var pattern = _step.value;
                        var matches = content.match(pattern);
                        if (matches) {
                            var _mockMatches;
                            (_mockMatches = mockMatches).push.apply(_mockMatches, _to_consumable_array(matches));
                        }
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally{
                    try {
                        if (!_iteratorNormalCompletion && _iterator.return != null) {
                            _iterator.return();
                        }
                    } finally{
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }
                var _iteratorNormalCompletion1 = true, _didIteratorError1 = false, _iteratorError1 = undefined;
                try {
                    // Count real implementation patterns
                    for(var _iterator1 = this.requiredRealPatterns[Symbol.iterator](), _step1; !(_iteratorNormalCompletion1 = (_step1 = _iterator1.next()).done); _iteratorNormalCompletion1 = true){
                        var pattern1 = _step1.value;
                        var matches1 = content.match(pattern1);
                        if (matches1) {
                            var _realMatches;
                            (_realMatches = realMatches).push.apply(_realMatches, _to_consumable_array(matches1));
                        }
                    }
                } catch (err) {
                    _didIteratorError1 = true;
                    _iteratorError1 = err;
                } finally{
                    try {
                        if (!_iteratorNormalCompletion1 && _iterator1.return != null) {
                            _iterator1.return();
                        }
                    } finally{
                        if (_didIteratorError1) {
                            throw _iteratorError1;
                        }
                    }
                }
                var mockCount = mockMatches.length;
                var realCount = realMatches.length;
                var total = mockCount + realCount;
                var mockPercentage = total > 0 ? mockCount / total * 100 : 0;
                // Determine tier based on file path
                var tier = this.detectTier(filePath);
                // Suspicious patterns found
                var suspiciousPatterns = [];
                // Check for anti-patterns
                if (content.includes('FAKE_PTY') || content.includes('MOCK_TERMINAL')) {
                    suspiciousPatterns.push('Explicit fake PTY detected');
                }
                if (content.includes('setTimeout(fn, 0)') && content.includes('await')) {
                    suspiciousPatterns.push('Suspicious instant async - may be hiding real timing');
                }
                if (tier >= 3 && mockPercentage > 50) {
                    suspiciousPatterns.push("Tier ".concat(tier, " has ").concat(mockPercentage.toFixed(1), "% mocks (max 50%)"));
                }
                // ANSI stripping detection (critical for TUI apps)
                if (content.includes('stripAnsi') || content.includes('replace(/\\x1b')) {
                    suspiciousPatterns.push('ANSI stripping detected - tests may not validate real output');
                }
                return {
                    tier: tier,
                    mockCount: mockCount,
                    realImplementationCount: realCount,
                    mockPercentage: mockPercentage,
                    suspiciousPatterns: suspiciousPatterns,
                    passed: suspiciousPatterns.length === 0
                };
            }
        },
        {
            key: "validateRuntimeBehavior",
            value: /**
   * Runtime validation - checks if PTY is actually being used
   */ function validateRuntimeBehavior(tier, testFn) {
                return _async_to_generator(function() {
                    var result, hasAnsi;
                    return _ts_generator(this, function(_state) {
                        switch(_state.label){
                            case 0:
                                return [
                                    4,
                                    testFn()
                                ];
                            case 1:
                                result = _state.sent();
                                // Tier 3+ must have real timing (not instant)
                                if (tier >= 3 && result.timing < 50) {
                                    return [
                                        2,
                                        {
                                            passed: false,
                                            reason: "Tier ".concat(tier, " test completed in ").concat(result.timing, "ms - too fast for real PTY (likely mocked)")
                                        }
                                    ];
                                }
                                // Tier 3+ output must contain ANSI sequences
                                if (tier >= 3) {
                                    hasAnsi = /\x1b\[|\x1b\]/.test(result.output);
                                    if (!hasAnsi) {
                                        return [
                                            2,
                                            {
                                                passed: false,
                                                reason: 'Output contains no ANSI sequences - likely mocked terminal'
                                            }
                                        ];
                                    }
                                }
                                return [
                                    2,
                                    {
                                        passed: true
                                    }
                                ];
                        }
                    });
                })();
            }
        },
        {
            key: "detectTier",
            value: function detectTier(filePath) {
                if (filePath.includes('tier1')) return 1;
                if (filePath.includes('tier2')) return 2;
                if (filePath.includes('tier3')) return 3;
                if (filePath.includes('tier4') || filePath.includes('e2e')) return 4;
                return 0;
            }
        }
    ]);
    return MockDetector;
}();
export var mockDetector = new MockDetector();
