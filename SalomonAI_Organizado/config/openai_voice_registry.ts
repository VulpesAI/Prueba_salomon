export type VoiceEndpointSupport = {
  tts: boolean;
  realtime: boolean;
};

export type OpenAIVoice = {
  id: string;
  label: string;
  supports: VoiceEndpointSupport;
};

import registry from './openai_voice_registry.json';

export const OPENAI_VOICES = registry as ReadonlyArray<OpenAIVoice>;

export type OpenAIVoiceId = (typeof OPENAI_VOICES)[number]['id'];
