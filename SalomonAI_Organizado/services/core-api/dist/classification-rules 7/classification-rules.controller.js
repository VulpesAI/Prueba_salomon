"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassificationRulesController = void 0;
const common_1 = require("@nestjs/common");
const classification_rules_service_1 = require("./classification-rules.service");
let ClassificationRulesController = class ClassificationRulesController {
    constructor(classificationRulesService) {
        this.classificationRulesService = classificationRulesService;
    }
};
exports.ClassificationRulesController = ClassificationRulesController;
exports.ClassificationRulesController = ClassificationRulesController = __decorate([
    (0, common_1.Controller)('classification-rules'),
    __metadata("design:paramtypes", [classification_rules_service_1.ClassificationRulesService])
], ClassificationRulesController);
//# sourceMappingURL=classification-rules.controller.js.map