/**
 * ecosystem.config.js — PM2 process manager config for AvaxSignal
 *
 * Usage:
 *   pm2 start ecosystem.config.js        # start both processes
 *   pm2 stop ecosystem.config.js         # stop both
 *   pm2 restart ecosystem.config.js      # restart both
 *   pm2 logs                             # view all logs
 *   pm2 save && pm2 startup              # auto-restart on VM reboot
 */

module.exports = {
  apps: [
    {
      name: "avaxsignal-server",
      script: "npx",
      args: "tsx server/index.ts",
      cwd: __dirname,
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      // Auto-restart on crash
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      // Logging
      out_file: "./logs/server-out.log",
      error_file: "./logs/server-err.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
    },
    {
      name: "avaxsignal-client",
      script: "npx",
      args: "vite preview --host 0.0.0.0 --port 4173",
      cwd: `${__dirname}/client`,
      interpreter: "none",
      env: {
        NODE_ENV: "production",
      },
      watch: false,
      autorestart: true,
      max_restarts: 5,
      restart_delay: 3000,
      out_file: "./logs/client-out.log",
      error_file: "./logs/client-err.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
