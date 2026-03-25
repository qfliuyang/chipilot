//# hash=f82d1de39cbe0d888179e050ce1ca26e
//# sourceMappingURL=index.js.map

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
function _instanceof(left, right) {
    "@swc/helpers - instanceof";
    if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) {
        return !!right[Symbol.hasInstance](left);
    } else {
        return left instanceof right;
    }
}
function _object_spread(target) {
    for(var i = 1; i < arguments.length; i++){
        var source = arguments[i] != null ? arguments[i] : {};
        var ownKeys = Object.keys(source);
        if (typeof Object.getOwnPropertySymbols === "function") {
            ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function(sym) {
                return Object.getOwnPropertyDescriptor(source, sym).enumerable;
            }));
        }
        ownKeys.forEach(function(key) {
            _define_property(target, key, source[key]);
        });
    }
    return target;
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
import Anthropic from "@anthropic-ai/sdk";
var SYSTEM_PROMPT = "You are chipilot, an AI assistant for physical design engineers.\nYou help users work with EDA tools like Cadence Innovus, Genus, and Synopsys ICC2, DC.\n\nWhen the user asks you to run a command or perform an action:\n1. First explain what you're going to do\n2. If it requires running a terminal command, propose it clearly\n3. The user will approve before execution\n\nYou have deep knowledge of:\n- Physical design concepts (floorplanning, placement, routing, timing closure)\n- Tcl scripting for EDA tools\n- File formats (LIB, LEF, DEF, SDC, SPEF)\n- Common EDA workflows and best practices\n\nBe concise but thorough. Explain your reasoning when suggesting commands.\n\nWhen you want to execute a command, format it like this:\n```execute\n<command to run>\n```\n\nThe system will then ask the user for approval before running it.";
export var Agent = /*#__PURE__*/ function() {
    "use strict";
    function Agent(options) {
        _class_call_check(this, Agent);
        _define_property(this, "provider", void 0);
        _define_property(this, "model", void 0);
        _define_property(this, "client", null);
        _define_property(this, "conversationHistory", []);
        this.provider = options.provider;
        this.model = options.model || this.getDefaultModel();
        if (options.provider === "anthropic") {
            var apiKey = options.apiKey || process.env.CHIPILOT_ANTHROPIC_API_KEY;
            var baseURL = options.baseURL || process.env.CHIPILOT_ANTHROPIC_BASE_URL;
            if (apiKey) {
                this.client = new Anthropic(_object_spread({
                    apiKey: apiKey
                }, baseURL ? {
                    baseURL: baseURL
                } : {}));
            }
        }
    }
    _create_class(Agent, [
        {
            key: "getDefaultModel",
            value: function getDefaultModel() {
                switch(this.provider){
                    case "anthropic":
                        return "claude-sonnet-4-6-20250514";
                    case "openai":
                        return "gpt-4-turbo";
                    default:
                        return "claude-sonnet-4-6-20250514";
                }
            }
        },
        {
            key: "chat",
            value: function chat(userMessage, context) {
                return _async_to_generator(function() {
                    var contextParts, contextMessage, fullMessage;
                    return _ts_generator(this, function(_state) {
                        // Build context message
                        contextParts = [];
                        if (context.terminalOutput) {
                            contextParts.push("Recent terminal output:\n```\n".concat(context.terminalOutput, "\n```"));
                        }
                        if (context.cwd) {
                            contextParts.push("Current directory: ".concat(context.cwd));
                        }
                        contextMessage = contextParts.length > 0 ? "\n\nContext:\n".concat(contextParts.join("\n\n")) : "";
                        fullMessage = userMessage + contextMessage;
                        // Add to conversation history
                        this.conversationHistory.push({
                            role: "user",
                            content: fullMessage
                        });
                        if (this.provider === "anthropic") {
                            return [
                                2,
                                this.chatAnthropic()
                            ];
                        }
                        // Fallback for other providers
                        return [
                            2,
                            {
                                message: 'Provider "'.concat(this.provider, '" is not yet implemented. Please use "anthropic" for now.')
                            }
                        ];
                    });
                }).call(this);
            }
        },
        {
            key: "chatAnthropic",
            value: function chatAnthropic() {
                return _async_to_generator(function() {
                    var response, textBlocks, message, commandMatch, command, explanation, error, errorMessage;
                    return _ts_generator(this, function(_state) {
                        switch(_state.label){
                            case 0:
                                if (!this.client) {
                                    return [
                                        2,
                                        {
                                            message: "Anthropic client not initialized. Please set CHIPILOT_ANTHROPIC_API_KEY environment variable."
                                        }
                                    ];
                                }
                                _state.label = 1;
                            case 1:
                                _state.trys.push([
                                    1,
                                    3,
                                    ,
                                    4
                                ]);
                                return [
                                    4,
                                    this.client.messages.create({
                                        model: this.model,
                                        max_tokens: 4096,
                                        system: SYSTEM_PROMPT,
                                        messages: this.conversationHistory
                                    })
                                ];
                            case 2:
                                response = _state.sent();
                                // Extract text from response
                                textBlocks = response.content.filter(function(block) {
                                    return block.type === "text";
                                });
                                message = textBlocks.map(function(b) {
                                    return b.text;
                                }).join("\n");
                                // Add to history
                                this.conversationHistory.push({
                                    role: "assistant",
                                    content: message
                                });
                                // Check for proposed commands
                                commandMatch = message.match(/```execute\n([\s\S]*?)\n```/);
                                if (commandMatch) {
                                    command = commandMatch[1].trim();
                                    // Extract explanation (text before the command block)
                                    explanation = message.split("```execute")[0].trim().slice(-200); // Last 200 chars before command
                                    return [
                                        2,
                                        {
                                            message: message.replace(/```execute\n[\s\S]*?\n```/, "").trim(),
                                            proposedCommand: {
                                                command: command,
                                                explanation: explanation
                                            }
                                        }
                                    ];
                                }
                                return [
                                    2,
                                    {
                                        message: message
                                    }
                                ];
                            case 3:
                                error = _state.sent();
                                errorMessage = _instanceof(error, Error) ? error.message : "Unknown error";
                                return [
                                    2,
                                    {
                                        message: "Error calling Claude API: ".concat(errorMessage)
                                    }
                                ];
                            case 4:
                                return [
                                    2
                                ];
                        }
                    });
                }).call(this);
            }
        },
        {
            key: "clearHistory",
            value: function clearHistory() {
                this.conversationHistory = [];
            }
        }
    ]);
    return Agent;
}();
export default Agent;
