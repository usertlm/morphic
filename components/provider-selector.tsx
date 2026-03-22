'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

import { Check, ChevronDown } from 'lucide-react'

import {
  getCookie,
  setCookie,
  subscribeToCookieChange
} from '@/lib/utils/cookies'

import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from './ui/dropdown-menu'

const PROVIDER_OPTIONS = [
  { value: 'minimax', label: 'MiniMax' },
  { value: 'ollama', label: 'Ollama' }
]

export function ProviderSelector({
  disabled = false
}: {
  disabled?: boolean
}) {
  const value = useSyncExternalStore(
    subscribeToCookieChange,
    () => {
      const savedProvider = getCookie('modelProvider')
      return savedProvider || 'minimax'
    },
    () => 'minimax'
  )
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    if (disabled) {
      setCookie('modelProvider', 'minimax')
    }
  }, [disabled])

  const handleProviderSelect = (provider: string) => {
    if (disabled) return
    setCookie('modelProvider', provider)
    setDropdownOpen(false)
  }

  const selectedValue = disabled ? 'minimax' : value
  const selectedOption = PROVIDER_OPTIONS.find(
    opt => opt.value === selectedValue
  )

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="text-sm rounded-full shadow-none gap-1 transition-all px-3 py-2 h-auto bg-muted border-none"
          disabled={disabled}
        >
          <span className="text-xs font-medium">{selectedOption?.label}</span>
          <ChevronDown
            className={`h-3 w-3 ml-0.5 opacity-50 transition-transform duration-200 ${
              dropdownOpen ? 'rotate-180' : ''
            }`}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[120px]"
        sideOffset={5}
      >
        {PROVIDER_OPTIONS.map(option => {
          const isSelected = selectedValue === option.value
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleProviderSelect(option.value)}
              className="relative flex items-center cursor-pointer"
            >
              <div className="w-4 h-4 mr-2 flex items-center justify-center">
                {isSelected && <Check className="h-3 w-3" />}
              </div>
              <span className="text-sm">{option.label}</span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
