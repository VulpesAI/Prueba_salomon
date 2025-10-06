import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

jest.mock('undici', () => {
  const actual = jest.requireActual<typeof import('undici')>('undici');
  return {
    ...actual,
    fetch: jest.fn(),
  };
});

import { Headers, Response } from 'undici';
import * as undici from 'undici';

import type { BelvoConfig } from '../../config/configuration';
import { BelvoService } from '../belvo.service';
import { GenerateBelvoLinkTokenDto } from '../dto/generate-link-token.dto';
import { TriggerBelvoSyncDto } from '../dto/trigger-sync.dto';

describe('BelvoService', () => {
  let fetchMock: jest.MockedFunction<typeof undici.fetch>;
  let config: BelvoConfig;
  let configService: ConfigService;
  let service: BelvoService;

  beforeEach(() => {
    fetchMock = undici.fetch as jest.MockedFunction<typeof undici.fetch>;
    fetchMock.mockReset();

    config = {
      enabled: true,
      baseUrl: 'https://sandbox.belvo.com',
      secretId: 'secret-id',
      secretPassword: 'secret-password',
      timeoutMs: 5000,
      webhookSecret: 'webhook-secret',
    };

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'belvo') {
          return config;
        }

        return undefined;
      }),
    } as unknown as ConfigService;

    service = new BelvoService(configService);
  });

  it('generates a link token using the Belvo API', async () => {
    const dto: GenerateBelvoLinkTokenDto = {
      userId: 'user-123',
      institution: 'bank_xyz',
    };

    const expiresAt = new Date(Date.now() + 60_000).toISOString();

    fetchMock.mockImplementationOnce(async (input, init) => {
      expect(input).toBe('https://sandbox.belvo.com/api/token/');
      expect(init?.method).toBe('POST');
      const headers = new Headers(init?.headers);
      expect(headers.get('authorization')).toBe(
        `Basic ${Buffer.from(`${config.secretId}:${config.secretPassword}`).toString('base64')}`,
      );

      const body = JSON.parse(String(init?.body ?? '{}'));
      expect(body).toMatchObject({
        id: dto.userId,
        access_mode: 'single',
        widget: { institution: dto.institution },
      });
      expect(Array.isArray(body.scopes)).toBe(true);
      expect(body.scopes).toContain('write_transactions');

      return new Response(
        JSON.stringify({
          token: 'token-xyz',
          expires_at: expiresAt,
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      );
    });

    const token = await service.generateLinkToken(dto);

    expect(token).toEqual({
      institution: dto.institution,
      userId: dto.userId,
      accessMode: 'single',
      expiresAt,
      token: 'token-xyz',
    });
  });

  it('propagates Belvo API errors when the token request fails', async () => {
    const dto: GenerateBelvoLinkTokenDto = {
      userId: 'user-123',
      institution: 'bank_xyz',
      accessMode: 'recurrent',
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'invalid credentials' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(service.generateLinkToken(dto)).rejects.toMatchObject({
      status: 401,
    });
  });

  it('triggers a link synchronization and maps the response', async () => {
    const dto: TriggerBelvoSyncDto = {
      userId: 'user-123',
      dataset: 'accounts',
    };

    fetchMock.mockImplementationOnce(async (input, init) => {
      expect(input).toBe('https://sandbox.belvo.com/api/links/link-123/sync/');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(String(init?.body ?? '{}'))).toEqual({ scope: dto.dataset });

      return new Response(
        JSON.stringify({
          id: 'task-1',
          status: 'queued',
          scheduled_at: '2024-05-01T12:00:00Z',
          started_at: null,
          finished_at: null,
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      );
    });

    const response = await service.triggerSynchronization('link-123', dto);

    expect(response).toEqual({
      linkId: 'link-123',
      dataset: 'accounts',
      scheduledAt: '2024-05-01T12:00:00.000Z',
      status: 'queued',
      taskId: 'task-1',
      startedAt: null,
      finishedAt: null,
    });
  });

  it('fails gracefully when the integration is disabled', async () => {
    config.enabled = false;

    await expect(
      service.generateLinkToken({ userId: 'user', institution: 'bank' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    await expect(service.triggerSynchronization('link', { userId: 'user' })).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
