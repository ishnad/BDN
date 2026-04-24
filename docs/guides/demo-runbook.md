# Vendor Wrangler — Live Demo Runbook

Use this guide during the Push to Prod pitch. Read it before going on stage.

---

## The Core Risk: PSTN Loopback

During a live stage demo, PA speaker audio feeds back into the phone mic. The AI hears its own
voice, causing hallucination loops where it repeats phrases indefinitely. Three mitigations —
apply all three for maximum safety.

---

## Mitigation A — OS-Level Voice Isolation (do before going on stage)

**iOS:**
Control Center → Mic Mode → **Voice Isolation**

**Android:**
Settings → Sound → **Enable Clear Calling**

---

## Mitigation B — Half-Duplex Muting (do during the call)

The instant you finish speaking to the vendor, **toggle Mute** on the native dialer.
Un-mute only when you need to speak again. This prevents the AI from hearing PA feedback
during vendor silence.

---

## Mitigation C — Echo Guardrails in Every Call Brief (automatic if wired correctly)

This exact prompt **must be injected into every Genspark payload** — not just the first call:

```
You are participating in a live stage demonstration via speakerphone.
You may hear background audience noise or slight echoes of your own voice.
IGNORE ALL ECHOES. Under no circumstances should you repeat a phrase if you
hear it echoed back to you. Proceed linearly with your task.
```

This is stored in `JobSpec.echoMitigationPrompt` and appended in `src/app/api/call/route.ts`.

---

## Mock Fallback (last-resort safety net)

If the live PSTN call is at risk of failing on stage (network issues, venue restrictions, etc.),
flip the toggle in `.env.local` **before** opening the demo:

```
USE_MOCK_CALL=true
```

When this is set, `src/app/api/call/route.ts` skips Genspark entirely and returns a hardcoded
transcript + audio snippet. The rest of the pipeline (Claude extraction → Supabase save →
dashboard) runs exactly as in production — the audience sees the full flow.

> Reset to `USE_MOCK_CALL=false` after the demo.

---

## Pre-Show Checklist

- [ ] OS Voice Isolation enabled on the demo phone
- [ ] `.env.local` keys all set (ANTHROPIC_API_KEY, GENSPARK_API_KEY, Supabase keys)
- [ ] `USE_MOCK_CALL` set to `true` or `false` — **decide before going on stage, not during**
- [ ] Presenter UI alert banner visible in the app: _"1. Enable OS Voice Isolation. 2. Mute dialer after speaking."_
- [ ] Test signup → submit → dashboard flow end-to-end at least once with mock data
- [ ] Confirm RLS: log in as two different users and verify each sees only their own reports

---

## Demo Script (golden path)

1. Open app → show login page → sign in as pre-seeded Customer account
2. Navigate to intake form → type natural language request (e.g. _"Call Acme Supplies and confirm our invoice #4821 payment date"_)
3. Enter vendor phone number → submit
4. Show status machine: `Queued → Dialing → In Progress → Completed`
5. Show extracted JSON outcome card: resolution status, confidence score, next step
6. Navigate to dashboard → show report in the list
7. Open report detail → show full cleaned transcript + triage recommendation
8. Switch to Supplier account → show empty dashboard (RLS working)
