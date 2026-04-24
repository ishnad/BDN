import { AlertTriangle } from 'lucide-react'

export default function PresenterBanner() {
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="text-sm text-amber-300 font-medium">
          Demo mode active —{' '}
          <span className="font-bold">1.</span> Enable OS Voice Isolation{' '}
          <span className="mx-1 text-amber-500">·</span>
          <span className="font-bold">2.</span> Mute dialer after speaking{' '}
          <span className="mx-1 text-amber-500">·</span>
          <span className="font-bold">3.</span> <code className="text-amber-200 bg-amber-900/30 px-1 rounded text-xs">USE_MOCK_CALL=true</code> bypasses live PSTN
        </p>
      </div>
    </div>
  )
}
