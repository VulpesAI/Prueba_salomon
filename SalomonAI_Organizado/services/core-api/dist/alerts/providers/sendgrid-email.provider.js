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
var SendGridEmailProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendGridEmailProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
let SendGridEmailProvider = SendGridEmailProvider_1 = class SendGridEmailProvider {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(SendGridEmailProvider_1.name);
    }
    async sendEmail(to, subject, content) {
        const apiKey = this.configService.get('SENDGRID_API_KEY');
        const sender = this.configService.get('SENDGRID_SENDER_EMAIL');
        if (!apiKey || !sender) {
            this.logger.warn('SendGrid not configured, skipping email dispatch.');
            return false;
        }
        try {
            await axios_1.default.post('https://api.sendgrid.com/v3/mail/send', {
                personalizations: [
                    {
                        to: [{ email: to }],
                    },
                ],
                from: { email: sender },
                subject,
                content: [
                    {
                        type: 'text/plain',
                        value: content,
                    },
                ],
            }, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 8000,
            });
            return true;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`SendGrid email dispatch failed: ${message}`);
            return false;
        }
    }
};
exports.SendGridEmailProvider = SendGridEmailProvider;
exports.SendGridEmailProvider = SendGridEmailProvider = SendGridEmailProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SendGridEmailProvider);
//# sourceMappingURL=sendgrid-email.provider.js.map