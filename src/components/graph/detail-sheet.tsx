import { useState, useEffect } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Building2, User, ChevronDown, Sparkles, FileDown, Loader2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import {
  getDocumentMetadata,
  getDocumentDownloadUrl,
  getDocumentBase64,
} from '@/lib/companies-house'
import type { CompanyProfile, AppointmentList, Filing } from '@/lib/companies-house'

export type SelectedNode =
  | { type: 'company'; data: CompanyProfile; filings: Filing[] }
  | { type: 'officer'; data: AppointmentList }

interface DetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedNode: SelectedNode | null
}

function FilingItem({ filing, companyName }: { filing: Filing; companyName: string }) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [contentUrl, setContentUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasPdf, setHasPdf] = useState<boolean | null>(null)
  const [summaryRequested, setSummaryRequested] = useState(false)
  const [summary, setSummary] = useState('')
  const [isSummarizing, setIsSummarizing] = useState(false)

  useEffect(() => {
    if (!contentUrl || summaryRequested) return
    setSummaryRequested(true)
    setIsSummarizing(true)

    const prompt =
      filing.type === 'AA'
        ? `Summarise the key financials from this company's annual accounts. Include revenue, profit/loss, net assets, and any notable changes. Conclude with a brief assessment of the company's overall financial health. Be concise.\n\nCompany: ${companyName}`
        : `Briefly summarise this UK Companies House filing in 1-2 sentences. Be specific and helpful to someone researching this company.\n\nCompany: ${companyName}\nFiling: ${filing.description.replaceAll('-', ' ').replaceAll('_', ' ')}\nCategory: ${filing.category}\nDate: ${filing.date}\nType: ${filing.type ?? 'N/A'}`

    getDocumentBase64({ data: contentUrl }).then(async (base64) => {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, pdfBase64: base64 }),
      })

      if (!res.ok || !res.body) {
        setIsSummarizing(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
          try {
            const json = JSON.parse(line.slice(6))
            const delta = json.choices?.[0]?.delta?.content
            if (delta) setSummary((prev) => prev + delta)
          } catch {
            // skip malformed chunks
          }
        }
      }

      setIsSummarizing(false)
    })
  }, [contentUrl])

  const handleOpen = async (open: boolean) => {
    if (!open || downloadUrl || loading) return
    if (!filing.links?.document_metadata) {
      setHasPdf(false)
      return
    }

    setLoading(true)
    try {
      const metadata = await getDocumentMetadata({ data: filing.links.document_metadata })
      if (metadata.resources['application/pdf']) {
        const url = await getDocumentDownloadUrl({ data: metadata.links.document })
        setDownloadUrl(url)
        setContentUrl(metadata.links.document)
        setHasPdf(true)
      } else {
        setHasPdf(false)
      }
    } catch {
      setHasPdf(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Collapsible onOpenChange={handleOpen}>
      <div className="rounded-lg border border-border">
        <CollapsibleTrigger className="flex w-full cursor-pointer items-start justify-between gap-2 p-3 text-left hover:bg-accent/50">
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm capitalize text-foreground">
                {filing.description.replaceAll('-', ' ').replaceAll('_', ' ')}
              </p>
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs capitalize text-muted-foreground">
                {filing.category.replaceAll('-', ' ')}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {filing.date}
              {filing.pages && ` · ${filing.pages} page${filing.pages !== 1 ? 's' : ''}`}
              {filing.type && ` · ${filing.type}`}
            </p>
          </div>
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform [[data-panel-open]_&]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border px-3 py-3">
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Fetching document...
              </div>
            )}
            {!loading && downloadUrl && (
              <div className="space-y-3">
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
                  <div className="prose prose-sm prose-invert max-w-none text-xs text-muted-foreground">
                    {isSummarizing && !summary && 'Summarising...'}
                    <Markdown remarkPlugins={[remarkGfm]}>{summary}</Markdown>
                    {isSummarizing && summary && (
                      <span className="animate-pulse">▋</span>
                    )}
                  </div>
                </div>
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                >
                  <FileDown className="mr-2 h-3.5 w-3.5" />
                  Download PDF
                </a>
              </div>
            )}
            {!loading && hasPdf === false && (
              <p className="text-xs text-muted-foreground">No PDF available for this filing.</p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

export function DetailSheet({ open, onOpenChange, selectedNode }: DetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] overflow-y-auto p-6 sm:max-w-[500px]">
        {selectedNode?.type === 'company' && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500" />
                <SheetTitle>{selectedNode.data.company_name}</SheetTitle>
              </div>
              <SheetDescription>Company {selectedNode.data.company_number}</SheetDescription>
            </SheetHeader>
            {selectedNode.filings.length > 0 && (
              <div className="mt-6 space-y-2">
                {selectedNode.filings.map((filing, i) => (
                  <FilingItem key={i} filing={filing} companyName={selectedNode.data.company_name} />
                ))}
              </div>
            )}
          </>
        )}
        {selectedNode?.type === 'officer' && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <SheetTitle>{selectedNode.data.name}</SheetTitle>
              </div>
              <SheetDescription>
                {selectedNode.data.total_results} appointment{selectedNode.data.total_results !== 1 && 's'}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-3">
              {selectedNode.data.items.map((apt, i) => (
                <div key={i} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-semibold text-foreground">
                    {apt.appointed_to.company_name ?? apt.appointed_to.company_number}
                  </p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {apt.officer_role.replaceAll('-', ' ')}
                  </p>
                  {apt.appointed_on && (
                    <p className="text-xs text-muted-foreground">
                      Appointed: {apt.appointed_on}
                      {apt.resigned_on && ` — Resigned: ${apt.resigned_on}`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
