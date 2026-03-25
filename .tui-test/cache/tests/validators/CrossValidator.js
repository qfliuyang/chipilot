//# hash=8b2ffca7027c32c8a77b251cbab7d678
//# sourceMappingURL=CrossValidator.js.map

/**
 * CrossValidator - Ensures consistent behavior across all tiers
 *
 * Runs the same scenarios at different tiers and verifies outputs match.
 * If Tier 2 (mocked) produces different output than Tier 3 (real PTY),
 * the Tier 2 test is flagged as potentially fake.
 */ function _array_like_to_array(arr, len) {
    if (len == null || len > arr.length) len = arr.length;
    for(var i = 0, arr2 = new Array(len); i < len; i++)arr2[i] = arr[i];
    return arr2;
}
function _array_with_holes(arr) {
    if (Array.isArray(arr)) return arr;
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
function _iterable_to_array_limit(arr, i) {
    var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];
    if (_i == null) return;
    var _arr = [];
    var _n = true;
    var _d = false;
    var _s, _e;
    try {
        for(_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true){
            _arr.push(_s.value);
            if (i && _arr.length === i) break;
        }
    } catch (err) {
        _d = true;
        _e = err;
    } finally{
        try {
            if (!_n && _i["return"] != null) _i["return"]();
        } finally{
            if (_d) throw _e;
        }
    }
    return _arr;
}
function _non_iterable_rest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _sliced_to_array(arr, i) {
    return _array_with_holes(arr) || _iterable_to_array_limit(arr, i) || _unsupported_iterable_to_array(arr, i) || _non_iterable_rest();
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
export var CrossValidator = /*#__PURE__*/ function() {
    "use strict";
    function CrossValidator() {
        _class_call_check(this, CrossValidator);
        _define_property(this, "scenarios", new Map());
    }
    _create_class(CrossValidator, [
        {
            /**
   * Register a validation scenario
   */ key: "registerScenario",
            value: function registerScenario(name, input, expectedPatterns) {
                var forbiddenPatterns = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : [];
                this.scenarios.set(name, {
                    input: input,
                    expectedPatterns: expectedPatterns,
                    forbiddenPatterns: forbiddenPatterns
                });
            }
        },
        {
            key: "validateAllScenarios",
            value: /**
   * Run cross-tier validation for all registered scenarios
   */ function validateAllScenarios(tierRunners) {
                return _async_to_generator(function() {
                    var results, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, _step_value, name, scenario, result, err;
                    return _ts_generator(this, function(_state) {
                        switch(_state.label){
                            case 0:
                                results = [];
                                _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                                _state.label = 1;
                            case 1:
                                _state.trys.push([
                                    1,
                                    6,
                                    7,
                                    8
                                ]);
                                _iterator = this.scenarios[Symbol.iterator]();
                                _state.label = 2;
                            case 2:
                                if (!!(_iteratorNormalCompletion = (_step = _iterator.next()).done)) return [
                                    3,
                                    5
                                ];
                                _step_value = _sliced_to_array(_step.value, 2), name = _step_value[0], scenario = _step_value[1];
                                return [
                                    4,
                                    this.runScenario(name, scenario, tierRunners)
                                ];
                            case 3:
                                result = _state.sent();
                                results.push(result);
                                _state.label = 4;
                            case 4:
                                _iteratorNormalCompletion = true;
                                return [
                                    3,
                                    2
                                ];
                            case 5:
                                return [
                                    3,
                                    8
                                ];
                            case 6:
                                err = _state.sent();
                                _didIteratorError = true;
                                _iteratorError = err;
                                return [
                                    3,
                                    8
                                ];
                            case 7:
                                try {
                                    if (!_iteratorNormalCompletion && _iterator.return != null) {
                                        _iterator.return();
                                    }
                                } finally{
                                    if (_didIteratorError) {
                                        throw _iteratorError;
                                    }
                                }
                                return [
                                    7
                                ];
                            case 8:
                                return [
                                    2,
                                    results
                                ];
                        }
                    });
                }).call(this);
            }
        },
        {
            key: "runScenario",
            value: function runScenario(name, scenario, tierRunners) {
                return _async_to_generator(function() {
                    var outputs, mismatches, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, _step_value, tier, runner, output, _iteratorNormalCompletion1, _didIteratorError1, _iteratorError1, _iterator1, _step1, pattern, regex, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, pattern1, regex1, error, err, outputValues, baseOutput, i, tierNum, normalized, similarity;
                    return _ts_generator(this, function(_state) {
                        switch(_state.label){
                            case 0:
                                outputs = new Map();
                                mismatches = [];
                                _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                                _state.label = 1;
                            case 1:
                                _state.trys.push([
                                    1,
                                    8,
                                    9,
                                    10
                                ]);
                                _iterator = tierRunners[Symbol.iterator]();
                                _state.label = 2;
                            case 2:
                                if (!!(_iteratorNormalCompletion = (_step = _iterator.next()).done)) return [
                                    3,
                                    7
                                ];
                                _step_value = _sliced_to_array(_step.value, 2), tier = _step_value[0], runner = _step_value[1];
                                _state.label = 3;
                            case 3:
                                _state.trys.push([
                                    3,
                                    5,
                                    ,
                                    6
                                ]);
                                return [
                                    4,
                                    runner(scenario.input)
                                ];
                            case 4:
                                output = _state.sent();
                                outputs.set(tier, output);
                                _iteratorNormalCompletion1 = true, _didIteratorError1 = false, _iteratorError1 = undefined;
                                try {
                                    // Check expected patterns
                                    for(_iterator1 = scenario.expectedPatterns[Symbol.iterator](); !(_iteratorNormalCompletion1 = (_step1 = _iterator1.next()).done); _iteratorNormalCompletion1 = true){
                                        pattern = _step1.value;
                                        regex = new RegExp(pattern);
                                        if (!regex.test(output)) {
                                            mismatches.push("Tier ".concat(tier, ': Missing expected pattern "').concat(pattern, '"'));
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
                                _iteratorNormalCompletion2 = true, _didIteratorError2 = false, _iteratorError2 = undefined;
                                try {
                                    // Check forbidden patterns
                                    for(_iterator2 = scenario.forbiddenPatterns[Symbol.iterator](); !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true){
                                        pattern1 = _step2.value;
                                        regex1 = new RegExp(pattern1);
                                        if (regex1.test(output)) {
                                            mismatches.push("Tier ".concat(tier, ': Found forbidden pattern "').concat(pattern1, '"'));
                                        }
                                    }
                                } catch (err) {
                                    _didIteratorError2 = true;
                                    _iteratorError2 = err;
                                } finally{
                                    try {
                                        if (!_iteratorNormalCompletion2 && _iterator2.return != null) {
                                            _iterator2.return();
                                        }
                                    } finally{
                                        if (_didIteratorError2) {
                                            throw _iteratorError2;
                                        }
                                    }
                                }
                                return [
                                    3,
                                    6
                                ];
                            case 5:
                                error = _state.sent();
                                mismatches.push("Tier ".concat(tier, ": Threw error - ").concat(error));
                                return [
                                    3,
                                    6
                                ];
                            case 6:
                                _iteratorNormalCompletion = true;
                                return [
                                    3,
                                    2
                                ];
                            case 7:
                                return [
                                    3,
                                    10
                                ];
                            case 8:
                                err = _state.sent();
                                _didIteratorError = true;
                                _iteratorError = err;
                                return [
                                    3,
                                    10
                                ];
                            case 9:
                                try {
                                    if (!_iteratorNormalCompletion && _iterator.return != null) {
                                        _iterator.return();
                                    }
                                } finally{
                                    if (_didIteratorError) {
                                        throw _iteratorError;
                                    }
                                }
                                return [
                                    7
                                ];
                            case 10:
                                // Cross-validate outputs between tiers
                                outputValues = Array.from(outputs.values());
                                if (outputValues.length >= 2) {
                                    baseOutput = this.normalizeOutput(outputValues[0]);
                                    for(i = 1; i < outputValues.length; i++){
                                        tierNum = Array.from(outputs.keys())[i];
                                        normalized = this.normalizeOutput(outputValues[i]);
                                        // Check structural similarity (not exact match due to timing/ANSI differences)
                                        similarity = this.calculateSimilarity(baseOutput, normalized);
                                        if (similarity < 0.7) {
                                            mismatches.push("Tier ".concat(tierNum, " output differs significantly from base tier (similarity: ").concat((similarity * 100).toFixed(1), "%)"));
                                        }
                                    }
                                }
                                return [
                                    2,
                                    {
                                        scenario: name,
                                        tier1Output: outputs.get(1),
                                        tier2Output: outputs.get(2),
                                        tier3Output: outputs.get(3),
                                        tier4Output: outputs.get(4),
                                        mismatches: mismatches,
                                        passed: mismatches.length === 0
                                    }
                                ];
                        }
                    });
                }).call(this);
            }
        },
        {
            key: "normalizeOutput",
            value: /**
   * Normalize output for comparison (strip timing-dependent ANSI)
   */ function normalizeOutput(output) {
                return output// Strip cursor positioning (timing-dependent)
                .replace(/\x1b\[\d+;\d+H/g, '')// Strip spinner sequences
                .replace(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/g, '*')// Normalize whitespace
                .replace(/\s+/g, ' ').trim();
            }
        },
        {
            key: "calculateSimilarity",
            value: /**
   * Calculate text similarity (0-1)
   */ function calculateSimilarity(a, b) {
                var longer = a.length > b.length ? a : b;
                var shorter = a.length > b.length ? b : a;
                if (longer.length === 0) return 1.0;
                var distance = this.levenshteinDistance(longer, shorter);
                return (longer.length - distance) / longer.length;
            }
        },
        {
            key: "levenshteinDistance",
            value: function levenshteinDistance(a, b) {
                var matrix = [];
                for(var i = 0; i <= b.length; i++){
                    matrix[i] = [
                        i
                    ];
                }
                for(var j = 0; j <= a.length; j++){
                    matrix[0][j] = j;
                }
                for(var i1 = 1; i1 <= b.length; i1++){
                    for(var j1 = 1; j1 <= a.length; j1++){
                        if (b.charAt(i1 - 1) === a.charAt(j1 - 1)) {
                            matrix[i1][j1] = matrix[i1 - 1][j1 - 1];
                        } else {
                            matrix[i1][j1] = Math.min(matrix[i1 - 1][j1 - 1] + 1, matrix[i1][j1 - 1] + 1, matrix[i1 - 1][j1] + 1);
                        }
                    }
                }
                return matrix[b.length][a.length];
            }
        }
    ]);
    return CrossValidator;
}();
export var crossValidator = new CrossValidator();
// Register chipilot-cli specific validation scenarios
crossValidator.registerScenario('welcome-message', [], [
    'Welcome to chipilot',
    'Agentic EDA',
    'Tab: switch'
], [
    'error',
    'exception',
    'failed'
]);
crossValidator.registerScenario('basic-input', [
    'hello'
], [
    'You',
    'hello'
], [
    'error',
    'undefined',
    'null'
]);
crossValidator.registerScenario('pane-switch', [
    'hello',
    '\t'
], [
    'Tab to return to chat',
    '[Tab to'
], [
    'hello.*input',
    'You.*hello'
] // Should NOT show chat input in terminal pane
);
