# ⬡ LearnForge — Course Platform

A full-featured Udemy-like e-learning platform template with a unique dark industrial + electric teal aesthetic.

## 🗂️ Project Structure

```
learnify/
├── index.html          — Login / Sign Up page
├── dashboard.html      — Student dashboard
├── course.html         — Course player (video + quiz + certificate)
├── css/
│   ├── main.css        — Design system & shared styles
│   ├── auth.css        — Auth page styles
│   ├── dashboard.css   — Dashboard styles
│   └── course.css      — Course player + certificate styles
├── js/
│   ├── auth.js         — Login/signup logic
│   ├── dashboard.js    — Dashboard logic
│   └── course.js       — Video player, quiz engine, certificate
└── README.md
```

## ✨ Features

### Authentication
- **Sign In** with email/password (demo: any credentials work)
- **Sign Up** with first/last name, email, password
- Password strength indicator
- Session stored in localStorage
- Auto-redirect if already logged in

### Dashboard
- Personalized greeting based on time of day
- Course progress ring with animation
- Stats: courses enrolled, certificates, hours, XP
- Course grid: in-progress, completed, explore
- Filter tabs
- Sidebar with nav + logout

### Course Player
- **3-column layout**: Curriculum sidebar | Video + Quiz | Related videos
- Simulated video player with progress bar, play/pause, speed control, seek
- Curriculum sidebar with section groupings and completion tracking
- "Up Next" related lessons in right panel
- Streak tracker

### Quiz System
- Multiple-choice questions after each video
- Option highlighting (correct = green, wrong = red)
- Explanation shown after answering
- Multi-question flow with progress dots
- Score summary

### Certificate Generation
- **Auto-generated** on course completion
- Professional print-quality certificate design
- Student name and course name populated dynamically
- "Download Certificate" opens print dialog
- Gold seal and signature lines

## 🎨 Design Language
- **Palette**: Deep black (#0a0a0f) + Electric Teal (#00e5c4) accent
- **Typography**: Bebas Neue (display) + DM Sans (body) + JetBrains Mono (code)
- **Style**: Dark industrial, grid backgrounds, animated orbs, noise texture
- Pure HTML/CSS/JS — no build tools or frameworks needed

## 🚀 Getting Started

Just open `index.html` in any modern browser. No server needed.

For best experience, use a local server:
```bash
# Python
python -m http.server 3000

# Node.js
npx serve .
```

Then open: http://localhost:3000

## 📝 Demo Credentials
Any email and password will work on the login form.
Sign up creates a new account with your entered name.

## 🔧 Customization
- Add more courses by editing the `courseData` object in `js/course.js`
- Add quiz questions in the `quizzes` object
- Modify colors in `css/main.css` (CSS variables at the top)
- Swap fonts by changing the Google Fonts import
