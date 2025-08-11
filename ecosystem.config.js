module.exports = {
  apps: [
    {
      name: "platformname",
      script: "npm",
      args: "start",
      interpreter: "none",

      env: {
        NODE_ENV: "dev",
      },
    },
  ],
};