import { Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  onSearch?: () => void
  loading?: boolean
}

export function SearchInput({ value, onChange, onSearch, loading }: SearchInputProps) {
  return (
    <div className="flex w-full max-w-lg">
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search for a person..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch?.()}
          disabled={loading}
          className="h-12 rounded-r-none border-r-0 pl-11 text-lg"
        />
      </div>
      <Button size="lg" className="h-12 rounded-l-none px-6" onClick={onSearch} disabled={loading}>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Search'}
      </Button>
    </div>
  )
}
