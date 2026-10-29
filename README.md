# FallGuard

Fall detection app (Expo SDK 58, TypeScript, Android). Uses the accelerometer to detect
free fall -> impact -> stillness, shows a 10 second "Are you OK?" countdown, then sends
the caregiver an automatic Telegram message with a Google Maps link.

## Run

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go on Android (phone and computer on the same Wi-Fi).

## Telegram setup

1. In Telegram, talk to @BotFather -> /newbot -> copy the Bot Token.
2. The caregiver opens the bot, presses Start and sends one message.
3. Open https://api.telegram.org/bot<TOKEN>/getUpdates and copy "chat":{"id": ...}.
4. Put both values in `.env.local` (`EXPO_PUBLIC_TELEGRAM_TOKEN`, `EXPO_PUBLIC_TELEGRAM_CHAT_ID`)
   and restart with `npx expo start --clear`. They are set in code only, not in the app.

## Structure

- `App.tsx` - tabs, monitoring state, keep-awake, opens the alert screen on a fall
- `src/fallDetector.ts` - state machine (IDLE, FREE_FALL, IMPACT, still => FALL)
- `src/useFallDetection.ts` - accelerometer hook (20 Hz)
- `src/AlertScreen.tsx` - countdown, vibration, GPS, Telegram send
- `src/MonitorScreen.tsx` - live magnitude chart, Monitoring Mode, Simulate fall
- `src/SettingsScreen.tsx` - token, chat ID, thresholds, test message
- `src/HistoryScreen.tsx` - event log
- `src/EmergencyInfo.tsx` - screen for bystanders after an alert: medical info, tap-to-call family/1669,
  spoken prompts, and the family's Telegram reply ("I'm on my way" / "I'll call them")
- `src/profile.ts` - sample person's medical info and family contact (edit before a real demo)
- `src/storage.ts`, `src/telegram.ts`, `src/ui.ts`

## Testing

Use "Simulate fall (demo)" to test the alert flow. For the real detector, drop the phone
onto a bed or pillow. Never test with a real fall. Tune thresholds in Settings per device.

## Limitations

Works only while the app is open on screen (Android Doze stops sensors in the background).
A background version needs a Development Build + foreground service. Telegram needs internet.
The bot token is stored on the device; a real product should send through a server.
