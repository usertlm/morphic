import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

import { getModelForModeAndType } from '@/lib/config/model-types'
import { getModelsConfig } from '@/lib/config/load-models-config'
import { ModelType } from '@/lib/types/model-type'
import { Model } from '@/lib/types/models'
import { SearchMode } from '@/lib/types/search'
import { isProviderEnabled } from '@/lib/utils/registry'

const DEFAULT_MODEL: Model = {
  id: 'gpt-5-mini',
  name: 'GPT-5 mini',
  provider: 'OpenAI',
  providerId: 'openai',
  providerOptions: {
    openai: {
      reasoningEffort: 'low',
      reasoningSummary: 'auto'
    }
  }
}

const VALID_MODEL_TYPES: ModelType[] = ['speed', 'quality']
const MODE_FALLBACK_ORDER: SearchMode[] = ['quick', 'adaptive']

interface ModelSelectionParams {
  cookieStore: ReadonlyRequestCookies
  searchMode?: SearchMode
}

function resolveModelForModeAndType(
  mode: SearchMode,
  type: ModelType
): Model | undefined {
  try {
    const model = getModelForModeAndType(mode, type)
    if (!model) {
      return undefined
    }

    if (!isProviderEnabled(model.providerId)) {
      console.warn(
        `[ModelSelection] Provider "${model.providerId}" is not enabled for mode "${mode}" and model type "${type}"`
      )
      return undefined
    }

    return model
  } catch (error) {
    console.error(
      `[ModelSelection] Failed to load model configuration for mode "${mode}" and type "${type}":`,
      error
    )
    return undefined
  }
}

/**
 * Determines which model to use based on the model type preference.
 *
 * Priority order:
 * 1. If modelProvider is in cookie -> use corresponding provider's model from config
 * 2. Otherwise -> use default ordering (speed → quality) for the active mode
 * 3. If the active mode has no enabled models, try remaining modes
 * 4. If config loading fails or providers are unavailable -> use DEFAULT_MODEL as fallback
 */
export function selectModel({
  cookieStore,
  searchMode
}: ModelSelectionParams): Model {
  const modelProviderCookie = cookieStore.get('modelProvider')?.value

  const requestedMode =
    searchMode && MODE_FALLBACK_ORDER.includes(searchMode)
      ? searchMode
      : 'quick'

  // If provider is specified in cookie, try to find a model for that provider
  if (modelProviderCookie) {
    try {
      const config = getModelsConfig()
      const { byMode } = config.models

      // Try both model types (speed/quality) for the requested mode
      for (const type of VALID_MODEL_TYPES) {
        const model = byMode[requestedMode]?.[type]
        if (model && model.providerId === modelProviderCookie) {
          if (isProviderEnabled(model.providerId)) {
            return model
          }
        }
      }

      // Fallback: try other modes
      for (const mode of MODE_FALLBACK_ORDER) {
        for (const type of VALID_MODEL_TYPES) {
          const model = byMode[mode]?.[type]
          if (model && model.providerId === modelProviderCookie) {
            if (isProviderEnabled(model.providerId)) {
              return model
            }
          }
        }
      }
    } catch (error) {
      console.error(
        `[ModelSelection] Failed to load model configuration for provider "${modelProviderCookie}":`,
        error
      )
    }
  }

  // Original logic: use speed → quality order
  const typePreferenceOrder: ModelType[] = []
  for (const knownType of VALID_MODEL_TYPES) {
    if (!typePreferenceOrder.includes(knownType)) {
      typePreferenceOrder.push(knownType)
    }
  }

  const modePreferenceOrder: SearchMode[] = Array.from(
    new Set<SearchMode>([requestedMode, ...MODE_FALLBACK_ORDER])
  )

  for (const candidateMode of modePreferenceOrder) {
    for (const candidateType of typePreferenceOrder) {
      const model = resolveModelForModeAndType(candidateMode, candidateType)
      if (model) {
        return model
      }
    }
  }

  if (!isProviderEnabled(DEFAULT_MODEL.providerId)) {
    console.warn(
      `[ModelSelection] Default model provider "${DEFAULT_MODEL.providerId}" is not enabled. Returning default model configuration.`
    )
  }

  return DEFAULT_MODEL
}

export { DEFAULT_MODEL }
