# Kosmo Discord: Human Setup Checklist (Automated Build Route)

Because the **KosmoBot** will programmatically build 90% of the server (roles, categories, channels, and permission overwrites), the human only needs to handle the tasks that are physically impossible for a bot to do.

## Phase 1: The Bare Minimum Server Setup (Human)
*Bots cannot create servers from scratch. You must provide the blank canvas.*

- [ ] **Create the Server:** Open Discord, click the `+` icon, and create a blank server named "Kosmo Community".
- [ ] **Enable Community:** Go to `Server Settings > Enable Community`. Follow the prompts. (This is required for announcement channels).
- [ ] **Set Security:** Go to `Server Settings > Safety Setup`. Set Verification Level to **Medium**.

## Phase 2: Registering KosmoBot (Human)
*You need to get the "keys" to the bot so the AI can start coding it.*

- [ ] Go to [Discord Developer Portal](https://discord.com/developers/applications).
- [ ] Create a "New Application" called **KosmoBot**.
- [ ] Go to the "Bot" tab, click "Reset Token", and securely save your **Bot Token**.
- [ ] Under **Privileged Gateway Intents**, turn ON the `Message Content Intent` and `Server Members Intent`.
- [ ] **Invite KosmoBot:** Go to the `OAuth2 > URL Generator` tab. Check `bot` and `applications.commands`. Under permissions, check **Administrator**. Copy the generated URL and paste it into your browser to invite the bot to your blank server.

## Phase 3: The Hierarchy Fix (Human)
*A bot cannot assign roles higher than its own role. You must put the bot at the top of the food chain.*

- [ ] Go to `Server Settings > Roles`.
- [ ] Create a `Kosmo Founder` role, give it Administrator, and assign it to yourself.
- [ ] Drag the `KosmoBot` role (created automatically when you invited the bot) so it sits directly underneath your `Kosmo Founder` role, but above everything else.

## Phase 4: Third-Party Bots (Human)
*Invite these bots manually. Once the KosmoBot builds the channels, you will configure these.*

- [ ] **Invite Carl-bot (carl.gg)**
- [ ] **Invite UnbelievaBoat (unbelievaboat.com)**
- [ ] **Invite Arcane (arcane.bot)**

---
**STOP HERE.** 

Once you have completed these 4 phases, the blank server is primed. 
The AI will now write the Node.js code for KosmoBot. The very first feature of that code will be a secret `/build_infrastructure` command. When you type that command, KosmoBot will instantly generate all 14 roles, 6 categories, and 30 channels automatically!
