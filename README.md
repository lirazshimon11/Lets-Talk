# Let's Talk

Let's Talk is a conversation-first dating app prototype built to explore a simple product idea: people should connect through personality and dialogue before judging each other by photos.

Unlike traditional dating apps where images dominate the first impression, Let's Talk starts every match as a mystery chat. Users create a profile, upload photos, set preferences, and then enter conversations where photos stay hidden until both people show real engagement.

This project was built as a full-stack product prototype using React, Supabase, realtime messaging, private image storage, internationalization, responsive mobile UX, and Android packaging with Capacitor.

## Product Highlights

- Photo reveal mechanic: profile photos are hidden at the start of a match and revealed only after mutual conversation and reactions.
- Realtime chat experience: messages, reactions, replies, unread states, day separators, emoji picker, and mobile gestures create a polished messaging flow.
- Privacy-aware image handling: uploaded profile images are stored privately and displayed through signed URLs.
- Matching flow: the home screen triggers a Supabase matching RPC and routes users directly into a new conversation.
- Profile and onboarding system: users can upload multiple photos, choose an avatar, answer personality questions, and set detailed match preferences.
- Compatibility thinking: match compatibility is calculated from both users' preferences and importance weights.
- Mobile-first interface: the app adapts into a native-app-style mobile shell with bottom navigation and focused chat views.
- Internationalization: the UI supports multiple languages and RTL direction switching for Hebrew.
- Native packaging path: the project includes Capacitor Android setup for turning the web app into a mobile application.

## Technical Stack

- React 19 with Vite
- React Router
- Supabase Auth, Postgres, Realtime, Storage, RLS, and RPC
- Supabase signed URLs for private media access
- i18next / react-i18next
- emoji-picker-react
- browser-image-compression
- lucide-react
- Capacitor Android

## Key Engineering Work

### Realtime Chat

The chat system uses Supabase Realtime subscriptions to update messages and conversation state live. It includes richer interaction patterns such as quick emoji reactions, full emoji picker reactions, swipe-to-reply on mobile, double-click reply on desktop, copy actions, unread markers, and animated emoji-only messages.

### Progressive Photo Reveal

The central product mechanic is implemented through conversation state. Chats begin with avatars and locked profile imagery. Once both participants meet the engagement conditions, the conversation switches to a revealed state and plays a visual reveal animation.

### Private Profile Media

Photos are uploaded to Supabase Storage after client-side compression. The database stores storage paths rather than permanent public URLs, and the frontend requests signed URLs when images need to be displayed.

### Onboarding And Preferences

The onboarding flow collects required profile data, photos, personal details, questionnaire answers, and match preferences. Preferences include age range, gender, appearance traits, religion, and importance weighting.

### Responsive Mobile UX

The app detects mobile contexts and switches to a mobile frame with bottom tab navigation. Deep chat views become full-screen and hide navigation chrome to feel closer to a native messaging app.

## App Flow

1. A user signs up or logs in with Supabase Auth.
2. The user uploads profile photos and completes onboarding.
3. The user starts a match search from the home screen.
4. The app creates or finds a conversation through Supabase.
5. Both users chat while photos remain hidden.
6. After mutual engagement, the app reveals the users' photos.
7. Revealed conversations unlock profile image viewing and richer chat settings.

## Project Structure

```text
.
|-- database_setup.sql
|-- fix_emoji_reactions.sql
|-- frontend/
|   |-- src/
|   |   |-- App.jsx
|   |   |-- i18n.js
|   |   |-- components/
|   |   |-- contexts/
|   |   |-- lib/
|   |   |-- pages/
|   |   `-- utils/
|   |-- public/
|   |-- android/
|   |-- capacitor.config.ts
|   |-- package.json
|   `-- vite.config.js
`-- PenTesting/
```

## Running Locally

Create a Vite environment file in `frontend/` with your Supabase project values:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
```

Install and start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Build for production:

```bash
cd frontend
npm run build
```

## Supabase Notes

The app expects Supabase Auth, Storage, Realtime, and Postgres tables for profiles, conversations, and messages. The included SQL files show part of the database setup, including profile creation and an RLS policy update for message reactions.

The matching function is expected to exist as a Supabase RPC named `match_user`.

## Android Build Path

The Capacitor configuration is already included:

- App id: `com.letstalk.app`
- App name: `Lets Talk`
- Web directory: `dist`

Typical workflow:

```bash
cd frontend
npm run build
npx cap sync android
npx cap open android
```

## Notes For Reviewers

This project is best viewed as a product-focused full-stack prototype. The strongest parts of the build are the custom dating concept, realtime chat UX, photo reveal mechanic, private media handling, onboarding depth, and mobile-first polish.

Some areas are still prototype-level, including parts of the database schema export, placeholder settings screens, and a few development/debug scripts left in the repository.
