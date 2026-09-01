# Kosmo Discord Agent

The official Discord Community Agent for the Kosmo platform. Built with Node.js, TypeScript, and Discord.js v14, integrated with Grok/xAI OpenAI-compatible LLM backends.

---

## Deployment & Scripts

- **Build:** \
pm run build\ (compiles TypeScript via \	sc\ into \dist/\)
- **Start (Production):** \
pm start\ (executes \
ode dist/index.js\)
- **Development:** \
pm run dev\ (executes \	s-node src/index.ts\)

---

## Required Environment Variables

Configure these environment variables in your deployment environment (e.g., Railway / \.env\):

| Variable | Description |
| :--- | :--- |
| \DISCORD_BOT_TOKEN\ | Bot authentication token from the Discord Developer Portal |
| \DISCORD_CLIENT_ID\ | Discord Application / Client ID for OAuth and slash commands |
| \DISCORD_GUILD_ID\ | Target Discord Guild (Server) ID |
| \FOUNDER_ROLE_ID\ | Role ID for Kosmo Founder (grants founder privileges) |
| \HIGH_KARMA_ROLE_ID\ | Role ID for High-Karma users (grants 20 requests/hour tier) |
| \INTRODUCTIONS_CHANNEL_ID\ | Channel ID for #introductions (triggers proactive welcome icebreakers) |
| \LLM_API_KEY\ | API key for the LLM completions service (xAI / Grok / OpenAI) |
| \LLM_MODEL\ | Model identifier for completions (default: \grok-beta\) |
| \LLM_BASE_URL\ | Base endpoint URL for the chat completions API (default: \https://api.x.ai/v1\) |
