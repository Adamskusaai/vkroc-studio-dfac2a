/* Copy to ar-r2-config.js and include it before ar.js after the Worker is deployed.\n   The origin is a public URL, not a secret. Leave it unset to keep today's local-only AR. */
window.__VK_R2 = { origin: '' }; // e.g. 'https://vkroc-ar.<account>.workers.dev'
