# Kosmo Discord Community: Master Execution Guide

This document is the actionable Standard Operating Procedure (SOP) for building the Kosmo Discord community. It outlines the exact steps, third-party bots, and custom architecture required to bring the master plan to life.

---

## Phase 1: Server Foundation & Security
1. **Create the Server:** Create a blank Discord server. Name it "Kosmo Community".
2. **Enable Community Features:** Go to `Server Settings > Enable Community`. This unlocks Announcement channels and the Welcome Screen.
3. **Set Security Levels:** 
   - Go to `Safety Setup > Verification Level`. Set it to **Medium** (Users must be registered on Discord for longer than 5 minutes).
   - Enable **Explicit Media Content Filter** for all members.

---

## Phase 2: Third-Party Bot Integration
To avoid reinventing the wheel, we will use established bots for standard infrastructure, leaving the custom "KosmoBot" strictly for LLM personality and product integration.

### 1. Carl-bot (Infrastructure & Moderation)
*   **Purpose:** Reaction Roles, Auto-Moderation, and Logging.
*   **Action Items:**
    *   Set up `#get-roles` using Carl-bot's Reaction Role builder (e.g., react with 💻 for `Tech & Engineering`).
    *   Configure Auto-Mod to automatically delete any messages containing `http://` or `https://` in `#general-chat`, and send a DM warning to the user.
    *   Set up a logging channel (`#mod-logs`) where Carl-bot tracks deleted messages and user joins/leaves.

### 2. UnbelievaBoat & Arcane (The Economy & Leveling)
*   **Purpose:** Handling the separation of Reputation (Karma) and Gambling (Sparks).
*   **Action Items:**
    *   **Arcane Bot (For Karma):** Use Arcane for pure XP/Leveling. Rename XP to `Karma`. As users chat, their Karma goes up. Set it so reaching Level 10 automatically assigns the "High-Karma User" role (which boosts their LLM rate limits).
    *   **UnbelievaBoat (For Sparks/Casino):** Rename the currency to `Sparks`. 
    *   Set up role-based `/daily` allowances: A default `Kosmosian` gets 500 Sparks/day. A `High-Karma User` gets 2,000 Sparks/day.
    *   Enable Casino games (`/slots`, `/roulette`) restricted to `#the-casino`. Users gamble Sparks, meaning they can go broke without losing their hard-earned Karma reputation.

### 3. Ticket Tool (Support & Feedback)
*   **Purpose:** Managing private support threads.
*   **Action Items:**
    *   Place a "Create Ticket" button in the `#contact-support` channel.
    *   Configure it to spawn private channels under the hidden `🛠️ ACTIVE TICKETS` category.

### 4. InviteTracker
*   **Purpose:** The Referral Engine.
*   **Action Items:**
    *   Track who invites the most people. Set up a monthly leaderboard in `#referral-leaderboard`. The top user each month receives actual `Compiles` for the Kosmo app.

---

## Phase 3: The Custom "KosmoBot" Setup
The KosmoBot is the crown jewel. It handles dynamic LLM conversations, proactive engagement, and hyper-specific role assignment.

### 1. Hosting Architecture
*   **Language:** Node.js (using `discord.js`) or Python (using `discord.py`).
*   **Hosting:** Deploy on a **DigitalOcean $5/mo VPS** or the **Oracle Cloud Always Free Tier** (ARM VPS). Do *not* use serverless (Vercel) or sleep-prone free tiers (Render), as the bot requires a 24/7 WebSocket connection to listen for `@tags`.
*   **Database:** You do *not* need an external database. The bot is stateless. It fetches context directly from Discord's message history. Rate limits are stored in a simple JavaScript `Map()` in memory that resets hourly.

### 2. Core Bot Logic (The Code)
*   **The Trigger Lock:** The bot must ignore all `messageCreate` events unless `message.mentions.has(client.user)` is true.
*   **Context Fetching:** When tagged, the bot runs `channel.messages.fetch({ limit: 15 })` to grab the conversation history, formats it, and sends it to the LLM API (Grok/OpenAI).
*   **Rate Limiting Engine:** 
    *   Check the user's roles before firing the API.
    *   If `@Kosmo Pro` -> Limit = 50/hr.
    *   If `@High-Karma User` (Bought via UnbelievaBoat) -> Limit = 20/hr.
    *   If `@Kosmosian` -> Limit = 5/hr.
    *   If limit exceeded, `message.reply("You've hit your hourly limit! Upgrade to Pro or go earn some Karma in the chat.")` without hitting the LLM API.

---

## Phase 4: Constructing the Channels & Roles
Build these manually or script them via the bot.

### The Role Hierarchy (Strict Order)
1. Kosmo Founder
2. Team Kosmo
3. KosmoBot (Custom Bot)
4. Carl-bot / UnbelievaBoat (Third-party bots)
5. Moderator
6. Kosmo VIP
7. Kosmo Max
8. Kosmo Pro
9. Feedback Champion
10. High-Karma User (Bought with Karma)
11. The Guilds: Tech & Engineering, Business & Strategy, Academia & Education, Law & Compliance, Creative & Design.
12. Kosmosian (Default)

### The Channel Layout
*   **📌 INFORMATION (Read-Only)**
    *   `#start-here`, `#announcements`, `#get-roles`
*   **🌐 THE KOSMOVERSE**
    *   `#general-chat`, `#introductions`, `#kosmo-recipes`, `#showcase`
*   **🕹️ THE ARCADE**
    *   `#daily-rewards`, `#the-casino`, `#referral-leaderboard`, `#count-to-infinity`, `#daily-poll`
*   **🎯 GUILD DISCUSSIONS**
    *   `#tech-and-engineering`, `#business-and-strategy`, `#academia-and-research`, `#legal-and-policy`, `#creatives-lounge`
*   **💡 FEEDBACK & SUPPORT**
    *   `#feature-requests`, `#bug-reports`, `#contact-support` (Tickets), `#champions-lounge` (Locked to Champions)
*   **💎 KOSMO PRO & MAX (Locked)**
    *   `#pro-lounge`, `#max-exclusive`, `#priority-support`
*   **🎙️ VOICE & STAGES**
    *   `🎧 Lofi Study Lounge`, `💬 Open Watercooler`, `🎙️ Weekly Founder AMA`, `💎 Max Mastermind`

---

## Phase 5: Copy-Paste Server Content (Founder Voice)
*This copy is written in the Kosmo blog voice: direct, zero fluff, no em dashes, Paul Graham-style insight.*

### 1. The Welcome Message (For `#start-here`)
**Post this as the very first message in the server.**

**[Welcome to Kosmo]**
Most AI tools want you to chat. We want you to build. 

Kosmo is an intent compiler. You feed it raw thinking, and it outputs structural reality. This server exists for one reason: to figure out how to compile better, faster, and with higher fidelity.

If you are here to drop crypto links or self-promote, you will be banned immediately. If you are here to figure out how to turn abstract ideas into deployed infrastructure, you are in the right place. 

**How to use this server:**
1. Head to `#get-roles` and pick your guild.
2. Go to `#introductions` and tell us what you are trying to build.
3. If you get stuck, tag `@KosmoBot`. It has a sharp tongue but it knows the documentation better than anyone.

Stop chatting. Start compiling.

### 2. The Link & Spam Warning (Auto-Mod DM)
**Configure Carl-bot to send this DM when it auto-deletes a link in `#general-chat`.**

**[Message Deleted]**
We don't do blind link dropping in general chat. It creates noise. 

If you built something using Kosmo, post it in `#showcase`. If you have a workflow you want to share, put it in `#kosmo-recipes`. If you just want to spam a link to your newsletter, do it somewhere else. Consider this your only warning.

### 3. The Proactive AI Icebreaker (For KosmoBot in `#introductions`)
**Configure the bot to reply with a variation of this when a new user posts their first message.**

Welcome. I am the Kosmo Architect. I don't write essays for you, but I do know how to compile intents. If you get stuck, tag me. If you just want to see if my prompt can roast your tech stack, tag me and ask. Otherwise, head over to `#get-roles` so I can categorize you properly.

### 4. The Rate Limit Rejection (For KosmoBot)
**When a free user hits their 5-message hourly quota.**

You have hit your API limit for the hour. Compute is not free. You have two options if you want to keep talking to me:
1. Go to `askkosmo.com` and upgrade to Kosmo Pro.
2. Go into `#general-chat`, answer some questions, earn some Karma, and buy a limit upgrade from the Reward Shop. 

I'll be here when you get back.
