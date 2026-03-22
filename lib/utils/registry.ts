import { anthropic } from '@ai-sdk/anthropic'
import { createGateway } from '@ai-sdk/gateway'
import { google } from '@ai-sdk/google'
import { createOpenAI, openai } from '@ai-sdk/openai'
import { createProviderRegistry, LanguageModel } from 'ai'
import { createOllama } from 'ollama-ai-provider-v2'

// Build providers object conditionally
const providers: Record<string, any> = {
  openai,
  anthropic,
  google,
  'openai-compatible': createOpenAI({
    apiKey: process.env.OPENAI_COMPATIBLE_API_KEY,
    baseURL: process.env.OPENAI_COMPATIBLE_API_BASE_URL
  }),
  gateway: createGateway({
    apiKey: process.env.AI_GATEWAY_API_KEY
  }),
  minimax: createOpenAI({
    apiKey: process.env.MINIMAX_API_KEY,
    baseURL: process.env.MINIMAX_BASE_URL || 'https://api.minimax.chat/v1'
  }),
  'minimax-compatible': createOpenAI({
    apiKey: process.env.MINIMAX_API_KEY,
    baseURL: (process.env.MINIMAX_BASE_URL || 'https://api.minimax.chat/v1') + '/chat/completions'
  })
}

// Only add Ollama if OLLAMA_BASE_URL is configured
if (process.env.OLLAMA_BASE_URL) {
  providers.ollama = createOllama({
    baseURL: `${process.env.OLLAMA_BASE_URL}/api`
  })
} else {
  // Fallback to user's Ollama server
  providers.ollama = createOllama({
    baseURL: 'http://47.100.22.92:11434/api'
  })
}

export const registry = createProviderRegistry(providers)

export function getModel(model: string): LanguageModel {
  return registry.languageModel(
    model as Parameters<typeof registry.languageModel>[0]
  )
}

export function isProviderEnabled(providerId: string): boolean {
  switch (providerId) {
    case 'openai':
      return !!process.env.OPENAI_API_KEY
    case 'anthropic':
      return !!process.env.ANTHROPIC_API_KEY
    case 'google':
      return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
    case 'openai-compatible':
      return (
        !!process.env.OPENAI_COMPATIBLE_API_KEY &&
        !!process.env.OPENAI_COMPATIBLE_API_BASE_URL
      )
    case 'gateway':
      return !!process.env.AI_GATEWAY_API_KEY
    case 'ollama':
      // Ollama is enabled with fallback URL configured
      return true
    case 'minimax':
    case 'minimax-compatible':
      return !!process.env.MINIMAX_API_KEY
    default:
      return false
  }
}
