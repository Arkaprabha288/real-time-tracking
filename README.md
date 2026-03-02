# Real-time Delivery Tracking (Web Demo)

This project is a simple web-based demo to:

1. Generate a shareable tracking link.
2. Open a thank-you page with emoji animation for the person who clicks the link.
3. Ask for location permission only when needed (browser remembers previously granted permissions).
4. Stream live location updates to a dashboard while the shared page remains open.

## Important limitation

A normal browser tab **cannot reliably send location after the user closes the page**.
For true background tracking in a food delivery product, use a dedicated mobile app with explicit, informed background location permission and clear privacy policy.

## Run locally

```bash
npm start
```

Open:
- Dashboard: `http://localhost:3000/`
- Share link example: generated from dashboard

## Privacy and consent

Only use this workflow where users have clearly opted in to location sharing.
