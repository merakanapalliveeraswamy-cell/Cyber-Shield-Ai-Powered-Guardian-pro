

# CyberShield — India's AI-Powered Digital Guardian

## Overview
A full-stack, production-ready web application that protects Indian users from cyber fraud, online grooming, and digital threats using AI-powered real-time analysis. Built with React, Supabase (auth + database), and Lovable AI for NLP-based threat detection. Bilingual: English + Hindi.

---

## Phase 1: Foundation & Authentication

### 1.1 Design System & Branding
- CyberShield branding with a trustworthy, modern look (blue/green tones for safety)
- Mobile-first responsive layout with dark/light mode toggle
- Large, accessible fonts and India-friendly iconography (shield, lock, family icons)
- Language switcher (English ↔ Hindi) available globally

### 1.2 Authentication & User Profiles
- Email + password signup/login via Supabase Auth
- Onboarding flow where users select their profile type: **Parent**, **Child**, or **Elderly**
- User profiles table storing name, preferred language, profile type
- Role-based UI — the app adapts its interface based on the selected profile type

### 1.3 Core Layout
- Responsive sidebar/bottom navigation
- Dashboard as the home screen after login
- Consistent header with language toggle, dark mode, notifications, and profile menu

---

## Phase 2: AI Scam & Phishing Detection Engine

### 2.1 Scam Scanner Page
- Text input area where users paste suspicious messages (SMS, WhatsApp, email text)
- URL input field for checking suspicious links
- "Scan Now" button that sends content to AI for analysis
- AI returns a **risk verdict**: ✅ Safe, ⚠️ Suspicious, 🔴 Dangerous
- Detailed AI explanation: "Why this is risky" with specific indicators highlighted
- India-specific scam categories detected:
  - UPI payment fraud, fake job/loan offers, fake government schemes
  - Courier delivery scams, bank/KYC impersonation, gaming scams

### 2.2 Scan History
- All past scans saved to database with timestamp, verdict, and category
- Filterable scan history page
- Stats: total scans, threats caught, most common scam types

### 2.3 Elderly "Is This a Scam?" Mode
- When profile type is "Elderly," the scanner page transforms into a simplified interface
- One large button: "Is This a Scam?"
- Extra-large text, minimal UI, clear color-coded results
- Audio/visual alert for dangerous content

---

## Phase 3: Child Safety AI Module

### 3.1 Grooming & Predator Detection
- Text analysis page where parents can paste chat excerpts for AI analysis
- AI detects: emotional manipulation, age deception, grooming language patterns
- Risk score output: Low / Medium / High with explanation
- **Privacy-first**: No chat text is permanently stored — analysis is ephemeral, only the verdict and score are saved

### 3.2 Safe Link Checker
- URL checker that flags explicit, violent, misleading, or scam content
- Returns safety rating with category labels
- Suggested safe alternatives when content is flagged

### 3.3 Digital Wellbeing Insights (Self-Reported)
- Since we can't monitor device screen time from a web app, this is a **self-reported wellbeing tracker**
- Daily check-in: "How much screen time today?", "How are you feeling?"
- AI-generated wellness tips based on patterns
- Trend charts showing wellbeing over time

---

## Phase 4: Parent Dashboard

### 4.1 Overview Dashboard
- Visual cards showing:
  - Threats blocked today / this week
  - Scam attempts detected (by category)
  - Child risk score (Low / Medium / High) based on recent analyses
  - Wellbeing check-in trends
- Charts powered by Recharts: threat trends over time, scam category breakdown (pie chart), daily activity

### 4.2 Alerts & Notifications
- In-app alert feed showing recent scan results and flagged content
- High-risk alerts highlighted prominently
- Alert history with filters

### 4.3 Family Management
- Add family members (children, elderly relatives) linked to the parent account
- View scan activity and risk scores per family member
- Weekly summary view with downloadable report (PDF-style page)

---

## Phase 5: Women's Online Safety Mode

### 5.1 Threat Analysis
- Paste suspicious messages or profile links for AI analysis
- AI detects: fake profiles, sextortion language, blackmail attempts, harassment patterns
- Risk assessment with clear next-step guidance

### 5.2 Safety Advisory
- AI-generated guidance: "What to do next" based on the detected threat
- Links to official Indian reporting resources (Cyber Crime Portal, NCW helpline info)
- Step-by-step advisory flow (non-panic, calm, informative)

---

## Phase 6: Impact & Presentation Pages

### 6.1 Impact Metrics Dashboard (Public)
- Aggregate statistics (simulated + real from database):
  - Total threats blocked across the platform
  - Scam categories prevented (breakdown)
  - Child safety alerts generated
  - Estimated money saved
- Animated counters and charts for visual impact

### 6.2 About & Mission Page
- The problem: rising cybercrime in India with real statistics
- CyberShield's approach: AI + privacy + inclusivity
- Team/mission section
- "India's AI Guardian for Children, Families & Everyday Digital Life" positioning

### 6.3 Landing Page
- Hero section with strong value proposition
- Feature highlights with icons
- User mode previews (Parent, Child, Elderly, Women)
- Call-to-action: Sign up to protect your family
- Impact numbers section

---

## Technical Architecture

### Frontend
- React + TypeScript + Tailwind CSS + shadcn/ui components
- Recharts for dashboard analytics
- i18n system for English/Hindi translations
- Dark/light mode with next-themes

### Backend (Supabase + Lovable Cloud)
- **Auth**: Supabase email/password authentication
- **Database**: User profiles, scan history, alerts, family members, wellbeing check-ins
- **Edge Functions**: AI analysis endpoints (scam detection, grooming detection, content safety)
- **AI**: Lovable AI Gateway using Gemini for NLP-based threat analysis

### AI Edge Functions
- `scan-message` — Analyzes text for scam/phishing patterns
- `check-url` — Evaluates URL safety
- `detect-grooming` — Analyzes chat text for grooming patterns
- `safety-advisor` — Generates safety guidance for detected threats

