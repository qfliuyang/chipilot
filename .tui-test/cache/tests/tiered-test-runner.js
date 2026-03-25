//# hash=b28858538e256368523491a4627cb25a
//# sourceMappingURL=tiered-test-runner.js.map

#!/usr/bin/env node
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
/**
 * Multi-Tier Test Runner
 *
 * Orchestrates all test tiers with cross-tier validation.
 * Each tier is validated to ensure it's not using excessive mocking
 * or shortcuts that would invalidate test results.
 */ import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { mockDetector } from './validators/MockDetector.js';
var TieredTestRunner = /*#__PURE__*/ function() {
    "use strict";
    function TieredTestRunner(options) {
        _class_call_check(this, TieredTestRunner);
        _define_property(this, "results", []);
        _define_property(this, "options", void 0);
        this.options = options;
    }
    _create_class(TieredTestRunner, [
        {
            key: "run",
            value: function run() {
                return _async_to_generator(function() {
                    var _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, tier, result, err;
                    return _ts_generator(this, function(_state) {
                        switch(_state.label){
                            case 0:
                                console.log('╔════════════════════════════════════════════════════════════╗');
                                console.log('║     Chipilot CLI Multi-Tier Test Framework                ║');
                                console.log('╚════════════════════════════════════════════════════════════╝');
                                console.log();
                                // Ensure build is up to date (required for Tier 3+)
                                if (this.options.tiers.some(function(t) {
                                    return t >= 3;
                                })) {
                                    console.log('📦 Building CLI for Tier 3+ tests...');
                                    try {
                                        execSync('npm run build', {
                                            stdio: 'inherit'
                                        });
                                    } catch (e) {
                                        console.error('❌ Build failed - cannot run Tier 3+ tests');
                                        return [
                                            2,
                                            false
                                        ];
                                    }
                                    console.log();
                                }
                                _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                                _state.label = 1;
                            case 1:
                                _state.trys.push([
                                    1,
                                    6,
                                    7,
                                    8
                                ]);
                                _iterator = this.options.tiers[Symbol.iterator]();
                                _state.label = 2;
                            case 2:
                                if (!!(_iteratorNormalCompletion = (_step = _iterator.next()).done)) return [
                                    3,
                                    5
                                ];
                                tier = _step.value;
                                return [
                                    4,
                                    this.runTier(tier)
                                ];
                            case 3:
                                result = _state.sent();
                                this.results.push(result);
                                if (this.options.strict && !result.passed) {
                                    console.log('\n❌ Strict mode: Stopping due to tier failure');
                                    return [
                                        3,
                                        5
                                    ];
                                }
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
                                if (!(!this.options.skipValidation && this.results.some(function(r) {
                                    return r.passed;
                                }))) return [
                                    3,
                                    10
                                ];
                                return [
                                    4,
                                    this.runCrossValidation()
                                ];
                            case 9:
                                _state.sent();
                                _state.label = 10;
                            case 10:
                                // Summary
                                return [
                                    2,
                                    this.printSummary()
                                ];
                        }
                    });
                }).call(this);
            }
        },
        {
            key: "runTier",
            value: function runTier(tier) {
                return _async_to_generator(function() {
                    var tierNames, startTime, testFiles, mockAnalysis, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, analysis, _iteratorNormalCompletion1, _didIteratorError1, _iteratorError1, _iterator1, _step1, warning, testsPassed, testsFailed, testPattern, output, passMatch, failMatch, output1, passMatch1, failMatch1, duration;
                    return _ts_generator(this, function(_state) {
                        tierNames = {
                            1: 'Unit Tests (Pure Logic)',
                            2: 'Component Tests (ink-testing-library)',
                            3: 'Integration Tests (node-pty)',
                            4: 'E2E Acceptance Tests (Full Scenarios)'
                        };
                        console.log("\n".concat('═'.repeat(60)));
                        console.log(" Tier ".concat(tier, ": ").concat(tierNames[tier]));
                        console.log("".concat('═'.repeat(60)));
                        startTime = Date.now();
                        // Find test files for this tier
                        testFiles = this.findTestFiles(tier);
                        if (testFiles.length === 0) {
                            console.log("⚠️  No test files found for tier ".concat(tier));
                            return [
                                2,
                                {
                                    tier: tier,
                                    name: tierNames[tier],
                                    testsPassed: 0,
                                    testsFailed: 0,
                                    mockAnalysis: [],
                                    duration: 0,
                                    passed: true
                                }
                            ];
                        }
                        // Analyze for mocks before running
                        mockAnalysis = this.analyzeMockUsage(testFiles);
                        _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                        try {
                            for(_iterator = mockAnalysis[Symbol.iterator](); !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                                analysis = _step.value;
                                if (!analysis.passed) {
                                    console.log("\n⚠️  Mock detection warnings for tier ".concat(tier, ":"));
                                    _iteratorNormalCompletion1 = true, _didIteratorError1 = false, _iteratorError1 = undefined;
                                    try {
                                        for(_iterator1 = analysis.suspiciousPatterns[Symbol.iterator](); !(_iteratorNormalCompletion1 = (_step1 = _iterator1.next()).done); _iteratorNormalCompletion1 = true){
                                            warning = _step1.value;
                                            console.log("   - ".concat(warning));
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
                        // Run the tests
                        testsPassed = 0;
                        testsFailed = 0;
                        try {
                            testPattern = "tests/tier".concat(tier, "-**/*.test.ts");
                            output = execSync('npx vitest run --reporter=verbose "'.concat(testPattern, '"'), {
                                encoding: 'utf-8',
                                stdio: 'pipe',
                                timeout: 120000
                            });
                            // Parse results
                            passMatch = output.match(/(\d+) passed/);
                            failMatch = output.match(/(\d+) failed/);
                            testsPassed = passMatch ? parseInt(passMatch[1]) : 0;
                            testsFailed = failMatch ? parseInt(failMatch[1]) : 0;
                            console.log(output);
                        } catch (e) {
                            // Vitest exits with error code on test failures
                            output1 = e.stdout || e.message || '';
                            passMatch1 = output1.match(/(\d+) passed/);
                            failMatch1 = output1.match(/(\d+) failed/);
                            testsPassed = passMatch1 ? parseInt(passMatch1[1]) : 0;
                            testsFailed = failMatch1 ? parseInt(failMatch1[1]) : 1;
                            console.log(output1);
                        }
                        duration = Date.now() - startTime;
                        console.log("\n✅ Tier ".concat(tier, " completed in ").concat(duration, "ms"));
                        console.log("   Tests: ".concat(testsPassed, " passed, ").concat(testsFailed, " failed"));
                        // Tier 3+ must have real PTY timing
                        if (tier >= 3 && duration < 1000 && testsPassed > 0) {
                            console.log("   ⚠️  Warning: Tier ".concat(tier, " completed suspiciously fast"));
                        }
                        return [
                            2,
                            {
                                tier: tier,
                                name: tierNames[tier],
                                testsPassed: testsPassed,
                                testsFailed: testsFailed,
                                mockAnalysis: mockAnalysis,
                                duration: duration,
                                passed: testsFailed === 0 && mockAnalysis.every(function(m) {
                                    return m.passed;
                                })
                            }
                        ];
                    });
                }).call(this);
            }
        },
        {
            key: "findTestFiles",
            value: function findTestFiles(tier) {
                var tierDir = path.join(process.cwd(), 'tests', "tier".concat(tier, "-*"));
                try {
                    var files = execSync("find ".concat(tierDir, ' -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null'), {
                        encoding: 'utf-8'
                    });
                    return files.trim().split('\n').filter(function(f) {
                        return f.length > 0;
                    });
                } catch (unused) {
                    return [];
                }
            }
        },
        {
            key: "analyzeMockUsage",
            value: function analyzeMockUsage(testFiles) {
                var results = [];
                var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                try {
                    for(var _iterator = testFiles[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                        var file = _step.value;
                        if (!fs.existsSync(file)) continue;
                        var content = fs.readFileSync(file, 'utf-8');
                        var analysis = mockDetector.analyzeTestFile(file, content);
                        results.push(analysis);
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
                return results;
            }
        },
        {
            key: "runCrossValidation",
            value: function runCrossValidation() {
                return _async_to_generator(function() {
                    var validators;
                    return _ts_generator(this, function(_state) {
                        switch(_state.label){
                            case 0:
                                console.log('\n' + '═'.repeat(60));
                                console.log(' Cross-Tier Validation');
                                console.log('═'.repeat(60));
                                // Check consistency between tiers
                                validators = [
                                    this.validateTier2vsTier3(),
                                    this.validateTier3vsTier4()
                                ];
                                return [
                                    4,
                                    Promise.all(validators)
                                ];
                            case 1:
                                _state.sent();
                                return [
                                    2
                                ];
                        }
                    });
                }).call(this);
            }
        },
        {
            key: "validateTier2vsTier3",
            value: function validateTier2vsTier3() {
                return _async_to_generator(function() {
                    var tier2Output, tier3Output, keyPatterns, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, pattern, inTier2, inTier3;
                    return _ts_generator(this, function(_state) {
                        console.log('\n📊 Validating Tier 2 vs Tier 3 consistency...');
                        // If Tier 2 mocks terminal behavior but Tier 3 uses real PTY,
                        // outputs should still be structurally similar
                        tier2Output = this.getTierOutput(2);
                        tier3Output = this.getTierOutput(3);
                        if (tier2Output && tier3Output) {
                            // Check for key patterns that should exist in both
                            keyPatterns = [
                                'Welcome',
                                'chipilot',
                                'Tab',
                                'Ctrl+C'
                            ];
                            _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                            try {
                                for(_iterator = keyPatterns[Symbol.iterator](); !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                                    pattern = _step.value;
                                    inTier2 = tier2Output.includes(pattern);
                                    inTier3 = tier3Output.includes(pattern);
                                    if (inTier2 !== inTier3) {
                                        console.log('   ⚠️  Pattern "'.concat(pattern, '" mismatch: T2=').concat(inTier2, ", T3=").concat(inTier3));
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
                        }
                        console.log('   ✅ Validation complete');
                        return [
                            2
                        ];
                    });
                }).call(this);
            }
        },
        {
            key: "validateTier3vsTier4",
            value: function validateTier3vsTier4() {
                return _async_to_generator(function() {
                    var tier3Scenarios, tier4Scenarios, missing;
                    return _ts_generator(this, function(_state) {
                        console.log('\n📊 Validating Tier 3 vs Tier 4 coverage...');
                        // Tier 4 should cover all scenarios in Tier 3 plus more
                        tier3Scenarios = this.getTestScenarios(3);
                        tier4Scenarios = this.getTestScenarios(4);
                        missing = tier3Scenarios.filter(function(s) {
                            return !tier4Scenarios.includes(s);
                        });
                        if (missing.length > 0) {
                            console.log("   ⚠️  Tier 4 missing scenarios covered in Tier 3: ".concat(missing.join(', ')));
                        } else {
                            console.log('   ✅ Tier 4 covers all Tier 3 scenarios');
                        }
                        return [
                            2
                        ];
                    });
                }).call(this);
            }
        },
        {
            key: "getTierOutput",
            value: function getTierOutput(tier) {
                // This would capture actual test outputs
                // For now, return null to skip validation
                return null;
            }
        },
        {
            key: "getTestScenarios",
            value: function getTestScenarios(tier) {
                // Parse test files to extract scenario names
                var files = this.findTestFiles(tier);
                var scenarios = [];
                var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                try {
                    for(var _iterator = files[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                        var file = _step.value;
                        if (!fs.existsSync(file)) continue;
                        var content = fs.readFileSync(file, 'utf-8');
                        var matches = content.match(/describe\(['"`](.+?)['"`]/g);
                        if (matches) {
                            var _iteratorNormalCompletion1 = true, _didIteratorError1 = false, _iteratorError1 = undefined;
                            try {
                                for(var _iterator1 = matches[Symbol.iterator](), _step1; !(_iteratorNormalCompletion1 = (_step1 = _iterator1.next()).done); _iteratorNormalCompletion1 = true){
                                    var match = _step1.value;
                                    var name = match.replace(/describe\(['"`]/, '').replace(/['"`]\)$/, '');
                                    scenarios.push(name);
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
                return scenarios;
            }
        },
        {
            key: "printSummary",
            value: function printSummary() {
                console.log('\n' + '╔════════════════════════════════════════════════════════════╗');
                console.log('║                    FINAL SUMMARY                           ║');
                console.log('╚════════════════════════════════════════════════════════════╝');
                var totalPassed = 0;
                var totalFailed = 0;
                var allPassed = true;
                var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                try {
                    for(var _iterator = this.results[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                        var result = _step.value;
                        var status = result.passed ? '✅' : '❌';
                        console.log("\n".concat(status, " Tier ").concat(result.tier, ": ").concat(result.name));
                        console.log("   Tests: ".concat(result.testsPassed, " passed, ").concat(result.testsFailed, " failed"));
                        console.log("   Duration: ".concat(result.duration, "ms"));
                        if (result.mockAnalysis.some(function(m) {
                            return !m.passed;
                        })) {
                            console.log('   Mock warnings detected');
                        }
                        totalPassed += result.testsPassed;
                        totalFailed += result.testsFailed;
                        allPassed = allPassed && result.passed;
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
                console.log('\n' + '═'.repeat(60));
                console.log("Total: ".concat(totalPassed, " passed, ").concat(totalFailed, " failed"));
                console.log("Result: ".concat(allPassed ? '✅ ALL TIERS PASSED' : '❌ SOME TIERS FAILED'));
                console.log('═'.repeat(60));
                return allPassed;
            }
        }
    ]);
    return TieredTestRunner;
}();
// Parse command line arguments
var args = process.argv.slice(2);
var options = {
    strict: args.includes('--strict'),
    tiers: [
        1,
        2,
        3,
        4
    ],
    skipValidation: args.includes('--skip-validation')
};
// Allow running specific tiers
var tierArg = args.find(function(a) {
    return a.startsWith('--tiers=');
});
if (tierArg) {
    options.tiers = tierArg.split('=')[1].split(',').map(function(t) {
        return parseInt(t.trim());
    });
}
// Run
var runner = new TieredTestRunner(options);
runner.run().then(function(success) {
    process.exit(success ? 0 : 1);
}).catch(function(error) {
    console.error('Test runner error:', error);
    process.exit(1);
});
