"use client"

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Upload, FileText, CheckCircle2, XCircle, AlertCircle, Loader2, Trash2 } from 'lucide-react'

interface GuestImportProps {
  eventId: string
  onImportSuccess?: () => void
}

interface ImportResult {
  imported: number
  skipped: number
  linked: number
  errors: string[]
}

export default function GuestImport({ eventId, onImportSuccess }: GuestImportProps) {
  const { getAccessToken } = usePrivy()
  const [csvData, setCsvData] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [clearExisting, setClearExisting] = useState(false)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCsvData(text)
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!csvData.trim()) {
      alert('Please upload or paste CSV data')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/events/${eventId}/import-guests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          csvData,
          clearExisting,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setResult(data.results)
        setCsvData('')
        onImportSuccess?.()
      } else {
        alert(data.error || 'Failed to import guests')
      }
    } catch (error) {
      console.error('Error importing guests:', error)
      alert('Failed to import guests')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    if (!confirm('Are you sure you want to delete all imported guests for this event?')) {
      return
    }

    setLoading(true)

    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/events/${eventId}/import-guests`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await res.json()

      if (res.ok) {
        alert(data.message)
        onImportSuccess?.()
      } else {
        alert(data.error || 'Failed to clear guests')
      }
    } catch (error) {
      console.error('Error clearing guests:', error)
      alert('Failed to clear guests')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Import Guest List
        </CardTitle>
        <CardDescription>
          Upload CSV exported from Luma, Eventbrite, or any platform
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* CSV Format Info */}
        <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
          <p className="font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Expected CSV Format:
          </p>
          <pre className="text-xs overflow-x-auto">
{`email,name,approval_status,registration_status
john@example.com,John Doe,approved,registered
jane@example.com,Jane Smith,approved,registered`}
          </pre>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>• <strong>email</strong>: Guest email (required)</p>
            <p>• <strong>name</strong>: Guest name (required)</p>
            <p>• <strong>approval_status</strong>: approved, pending, declined, waitlist (default: approved)</p>
            <p>• <strong>registration_status</strong>: registered, cancelled (default: registered)</p>
          </div>
        </div>

        {/* File Upload */}
        <div>
          <label className="text-sm font-medium">Upload CSV File</label>
          <div className="mt-2">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
            />
          </div>
        </div>

        {/* Manual Paste */}
        <div>
          <label className="text-sm font-medium">Or Paste CSV Data</label>
          <Textarea
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            placeholder="Paste CSV content here..."
            rows={6}
            className="mt-2 font-mono text-xs"
          />
        </div>

        {/* Options */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="clearExisting"
            checked={clearExisting}
            onChange={(e) => setClearExisting(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="clearExisting" className="text-sm">
            Clear existing guest list before importing
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleImport}
            disabled={!csvData.trim() || loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import Guests
              </>
            )}
          </Button>

          <Button
            variant="destructive"
            onClick={handleClear}
            disabled={loading}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>

        {/* Import Results */}
        {result && (
          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-semibold">Import Results</h3>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-2xl font-bold text-green-600">{result.imported}</span>
                </div>
                <p className="text-xs text-muted-foreground">Imported</p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  <span className="text-2xl font-bold text-blue-600">{result.linked}</span>
                </div>
                <p className="text-xs text-muted-foreground">Linked Users</p>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-2xl font-bold text-yellow-600">{result.skipped}</span>
                </div>
                <p className="text-xs text-muted-foreground">Skipped</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg">
                <p className="font-medium text-red-600 flex items-center gap-2 mb-2">
                  <XCircle className="h-4 w-4" />
                  Errors ({result.errors.length})
                </p>
                <div className="space-y-1 text-xs text-red-600 max-h-40 overflow-y-auto">
                  {result.errors.map((error, i) => (
                    <p key={i}>• {error}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-muted p-3 rounded-lg text-sm">
              <p className="text-green-600 font-medium">✓ Import Complete!</p>
              <p className="text-xs text-muted-foreground mt-1">
                Approved guests who are registered can now check in to the event.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
