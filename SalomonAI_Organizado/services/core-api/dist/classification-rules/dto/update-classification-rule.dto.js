"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateClassificationRuleDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_classification_rule_dto_1 = require("./create-classification-rule.dto");
class UpdateClassificationRuleDto extends (0, mapped_types_1.PartialType)(create_classification_rule_dto_1.CreateClassificationRuleDto) {
}
exports.UpdateClassificationRuleDto = UpdateClassificationRuleDto;
//# sourceMappingURL=update-classification-rule.dto.js.map